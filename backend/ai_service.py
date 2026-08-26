from google import genai
import pymupdf                # replaces fitz
import docx
import json
import os
import io
from fastapi import HTTPException
from dotenv import load_dotenv
import time

load_dotenv()

# ── Configure Gemini (new SDK) ────────────────────────────────────────────────
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")


# ── Text Extraction ───────────────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        pdf_document = pymupdf.open(stream=file_bytes, filetype="pdf")
        text = ""
        for page in pdf_document:
            text += page.get_text()
        pdf_document.close()

        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from PDF. File may be image-based."
            )
        return text

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")


def extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        doc = docx.Document(io.BytesIO(file_bytes))
        text = "\n".join([para.text for para in doc.paragraphs])

        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from DOCX. File may be empty."
            )
        return text

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process DOCX: {str(e)}")


def extract_resume_text(file_bytes: bytes, file_type: str) -> str:
    if file_type == "pdf":
        return extract_text_from_pdf(file_bytes)
    elif file_type == "docx":
        return extract_text_from_docx(file_bytes)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_type}")


# ── Gemini Analysis ───────────────────────────────────────────────────────────

def build_prompt(resume_text: str) -> str:
    return f"""
You are an expert ATS (Applicant Tracking System) analyzer and career coach
with 10 years of experience reviewing resumes for top tech companies.

Analyze the following resume and respond with ONLY a valid JSON object.
No explanation, no markdown, no code blocks — just the raw JSON.

The JSON must follow this exact structure:
{{
    "ats_score": <integer 0-100 based on ATS compatibility>,
    "overall_feedback": "<2-3 sentences summarizing the resume quality>",
    "skill_gaps": ["<missing skill 1>", "<missing skill 2>", "<missing skill 3>"],
    "improvements": [
        {{
            "section": "<resume section name>",
            "issue": "<what is wrong>",
            "suggestion": "<specific actionable fix>"
        }}
    ],
    "keywords_missing": ["<ATS keyword 1>", "<ATS keyword 2>"],
    "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"]
}}

ATS Score guide:
0-40:  Poor — major issues, unlikely to pass ATS
41-60: Below average — needs significant improvement
61-75: Average — passes basic ATS but not competitive
76-90: Good — strong resume with minor improvements needed
91-100: Excellent — highly optimized for ATS

Resume to analyze:
---
{resume_text}
---
"""

def analyze_resume_with_gemini(resume_text: str) -> dict:
    
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            prompt = build_prompt(resume_text)
            
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt
            )
            
            response_text = response.text.strip()
            
            # Clean markdown
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            result = json.loads(response_text)
            
            required_fields = [
                "ats_score", "overall_feedback",
                "skill_gaps", "improvements",
                "keywords_missing", "strengths"
            ]
            for field in required_fields:
                if field not in result:
                    raise ValueError(f"Missing field: {field}")
            
            result["ats_score"] = max(0, min(100, result["ats_score"]))
            return result

        except json.JSONDecodeError:
            # Gemini returned bad JSON — retry
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # wait 1s, 2s, 4s
                continue
            raise HTTPException(
                status_code=500,
                detail="AI returned invalid JSON after 3 attempts."
            )
        except Exception as e:
            error_str = str(e)
            
            # Rate limit — wait and retry
            if "429" in error_str:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue
                    
            # Server error — retry
            if "503" in error_str:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue
            
            # Other errors — fail immediately
            raise HTTPException(
                status_code=500,
                detail=f"AI analysis failed: {error_str}"
            )

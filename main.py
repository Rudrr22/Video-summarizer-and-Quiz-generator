from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from utils.youtube import get_transcript
from services.text_cleaner import clean_transcript
from services.summarizer import generate_summary
from services.quiz_generator import generate_quiz

app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class VideoRequest(BaseModel):
    url: str


@app.get("/")
def home():
    return {
        "message": "Video Summarizer API is running"
    }


@app.post("/transcript")
def transcript(request: VideoRequest):

    try:
        text = get_transcript(request.url)

        cleaned_text = clean_transcript(text)

        return {
            "transcript": cleaned_text
        }

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@app.post("/summary")
def summary(request: VideoRequest):

    try:
        text = get_transcript(request.url)

        cleaned_text = clean_transcript(text)

        summary_text = generate_summary(cleaned_text)

        return {
            "summary": summary_text
        }

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@app.post("/quiz")
def quiz(request: VideoRequest):

    try:
        text = get_transcript(request.url)

        cleaned_text = clean_transcript(text)

        summary_text = generate_summary(cleaned_text)

        quiz_data = generate_quiz(summary_text)

        return {
            "quiz": quiz_data
        }

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@app.post("/analyze")
def analyze(request: VideoRequest):

    try:
        # Get transcript
        text = get_transcript(request.url)

        # Clean transcript
        cleaned_text = clean_transcript(text)

        # Generate summary
        summary_text = generate_summary(cleaned_text)

        # Generate quiz
        quiz_data = generate_quiz(summary_text)

        return {
            "summary": summary_text,
            "quiz": quiz_data
        }

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
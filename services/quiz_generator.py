import os
import json

from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)


def generate_quiz(summary):

    prompt = f"""
    Generate 10 multiple-choice questions from the summary below.

    Return ONLY valid JSON.

    Format:

    [
      {{
        "question": "Question text",
        "options": [
          "Option 1",
          "Option 2",
          "Option 3",
          "Option 4"
        ],
        "correct_answer": "Correct option",
        "explanation": "Explanation"
      }}
    ]

    Requirements:
    - Exactly 10 questions
    - 4 options per question
    - One correct answer
    - Short explanation
    - Return only JSON

    Summary:
    {summary}
    """

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.3
    )

    quiz_text = response.choices[0].message.content

    try:
        return json.loads(quiz_text)

    except json.JSONDecodeError:
        return {
            "error": "Failed to generate valid quiz JSON",
            "raw_response": quiz_text
        }
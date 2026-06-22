import os

from groq import Groq
from dotenv import load_dotenv

from services.chunker import chunk_text

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)


def summarize_chunk(chunk):

    prompt = f"""
    Summarize the following text.

    Requirements:
    - Use bullet points
    - Focus only on important concepts
    - Be concise
    - No introduction
    - No conclusion

    Text:
    {chunk}
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

    return response.choices[0].message.content


def generate_final_summary(combined_summaries):

    prompt = f"""
    The following text contains summaries from different parts of a video.

    Create ONE final summary.

    Requirements:
    - Remove duplicate points
    - Keep only the most important concepts
    - Use bullet points
    - Maximum 10 bullet points
    - Produce a coherent final summary

    Summaries:
    {combined_summaries}
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

    return response.choices[0].message.content


def generate_summary(transcript):

    chunks = chunk_text(transcript)

    chunk_summaries = []

    for chunk in chunks:

        summary = summarize_chunk(chunk)

        chunk_summaries.append(summary)

    combined_summaries = "\n\n".join(chunk_summaries)

    final_summary = generate_final_summary(
        combined_summaries
    )

    return final_summary
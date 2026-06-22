import re


def clean_transcript(text):

    text = text.replace("♪", "")

    text = re.sub(r"\s+", " ", text)

    return text.strip()
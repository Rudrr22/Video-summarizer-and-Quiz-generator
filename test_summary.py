from services.summarizer import generate_summary

text = """
Machine learning is a field of artificial intelligence.
It allows systems to learn from data without being explicitly programmed.
"""

summary = generate_summary(text)

print(summary)
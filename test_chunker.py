from services.chunker import chunk_text

text = "A" * 10000

chunks = chunk_text(text)

print(len(chunks))
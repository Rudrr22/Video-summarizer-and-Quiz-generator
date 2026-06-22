from services.quiz_generator import generate_quiz

summary = """
Machine Learning enables systems to learn from data.
Decision Trees split data based on features.
Random Forest combines multiple trees.
"""

quiz = generate_quiz(summary)

print(quiz)
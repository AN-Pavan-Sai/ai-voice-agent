from app.services.llm import generate_ai_response


response = generate_ai_response(
    "I want to book appointment tomorrow"
)

print(response)
import json
from anthropic import AsyncAnthropic
from pydantic import ValidationError
from typing import Union
from app.parser.schema import ParsedMandate

class MandateParser:
    def __init__(self, client: AsyncAnthropic, model: str = "claude-3-haiku-20240307"):
        self.client = client
        self.model = model

    async def parse(self, raw_text: str) -> Union[ParsedMandate, dict]:
        """
        Parses a raw text into a structured mandate using LLM tool schemas.
        Retries exactly once if validation fails.
        """
        system_prompt = (
            "You are a strict policy extraction assistant. "
            "Extract limits, rules, and categories from the user's text into the exact schema. "
            "If a field is not specified, leave it null—never invent limits. "
            "If the intent is highly ambiguous, generate clarifying_questions instead of guessing."
        )

        tool_schema = {
            "name": "extract_mandate",
            "description": "Extracts structured rules from natural language mandate",
            "input_schema": ParsedMandate.model_json_schema()
        }

        messages = [{"role": "user", "content": raw_text}]

        for attempt in range(2):
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                system=system_prompt,
                messages=messages,
                tools=[tool_schema],
                tool_choice={"type": "tool", "name": "extract_mandate"}
            )

            # Find tool use
            tool_use = next((c for c in response.content if c.type == "tool_use" and c.name == "extract_mandate"), None)
            
            if not tool_use:
                return {"error": "LLM failed to use the extraction tool."}

            try:
                # Pydantic validation
                parsed = ParsedMandate(**tool_use.input)
                return parsed
            except ValidationError as e:
                if attempt == 0:
                    # Feed error back for retry
                    error_msg = f"Validation Error on your JSON output: {str(e)}. Please correct it."
                    messages.append({"role": "assistant", "content": response.content})
                    messages.append({"role": "user", "content": error_msg})
                else:
                    # Fail with 422 equivalent structure
                    return {
                        "error": "Unprocessable Entity",
                        "details": e.errors()
                    }
        
        return {"error": "Unknown error during parsing."}

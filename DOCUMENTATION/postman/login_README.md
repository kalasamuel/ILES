Login API Validation Evidence (Postman)

Files:
- `login_api_examples.postman_collection.json` — Postman collection with two requests and saved responses.

Requests included:
- `Login - Success`: POST `/api/accounts/users/login/` with `email` and `password` (returns `access` and `refresh` tokens and `user` data).
- `Login - Invalid Credentials`: same endpoint with a wrong password, returns 401 and `{"error": "Invalid credentials"}`.

How to produce evidence screenshots

1. Import the collection: File → Import → choose `login_api_examples.postman_collection.json`.
2. Update collection variables or environment:
   - `baseUrl` → e.g., `http://localhost:8000`
   - `email` → a real user email present in the DB (default: `login-user@example.com`)
   - `password` → valid password for the user
3. Run the success request (`Login - Success`) and confirm you receive `200` and tokens. Capture a screenshot of the request and response pane and save as `login_success.png`.
4. Run the invalid credentials request (`Login - Invalid Credentials`) and confirm you receive `401` with the error JSON. Capture a screenshot and save as `login_validation_error.png`.
5. Optionally save each response as an Example (three-dots menu → Save Response → Save as Example) and export the collection with examples for submission.

What to attach in your report

- The exported Postman collection (v2.1) with saved examples.
- `login_success.png` — screenshot showing request, request body, and success response.
- `login_validation_error.png` — screenshot showing request and validation/401 response.

If you provide a test user's `email` and `password` I can update the collection variables for you so it's ready to run immediately.
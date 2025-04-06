source venv/bin/activate && python3.12 main.py

nohup uvicorn main:app --host 0.0.0.0 --port 5000 &
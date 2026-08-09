import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from sqlalchemy.orm import Session
from app.models.database import SessionLocal, Store, Product
from app.engines.ai_interpreter import answer_owner_question

def main():
    db = SessionLocal()
    try:
        # Get a test store
        store = db.query(Store).first()
        if not store:
            print("No store found. Ensure you have seeded the database.")
            return

        question = "Why did my sales drop yesterday?"
        print(f"Question: {question}")
        print("-" * 50)
        
        response = answer_owner_question(db, store.id, question)
        
        print(f"Data Quality: {response['data_quality']}")
        print(f"Confidence: {response['confidence']}")
        print(f"Fallback Used: {response['fallback_used']}")
        print(f"Model Used: {response['model_used']}")
        print("\nAnswer:")
        print(response['answer'])
        print("\nEvidence Used:")
        for item in response['evidence_used']:
            print(f"  - {item}")
            
    finally:
        db.close()

if __name__ == "__main__":
    main()

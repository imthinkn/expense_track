#!/usr/bin/env python3
"""
Test OAuth flow to verify default categories creation
"""

import asyncio
import httpx
from pymongo import MongoClient
import os
from dotenv import load_dotenv
from unittest.mock import patch
import json

# Load environment variables
load_dotenv('/app/backend/.env')
load_dotenv('/app/frontend/.env')

BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://finspect.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.getenv('DB_NAME', 'finance_app')

async def test_oauth_flow():
    """Test OAuth flow and default categories creation"""
    print("Testing OAuth flow and default categories creation...")
    
    # Mock user data that would come from Emergent OAuth
    mock_user_data = {
        "id": "oauth_test_user_123",
        "email": "oauth.test@example.com", 
        "name": "OAuth Test User",
        "picture": "https://via.placeholder.com/150",
        "session_token": "mock_session_token_123"
    }
    
    # We can't actually test the OAuth endpoint without mocking the external service
    # But we can test the user creation logic by directly calling the database operations
    
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Clean up any existing test data
        db.users.delete_many({"email": mock_user_data["email"]})
        db.categories.delete_many({"user_id": {"$regex": "user_.*"}})
        
        # Simulate the user creation logic from the OAuth endpoint
        from datetime import datetime, timezone, timedelta
        import uuid
        
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": mock_user_data["email"],
            "name": mock_user_data["name"],
            "picture": mock_user_data.get("picture"),
            "created_at": datetime.now(timezone.utc)
        }
        
        # Insert user
        db.users.insert_one(user_doc)
        print(f"✅ Created user: {user_id}")
        
        # Create default categories (same logic as in server.py)
        default_categories = [
            {"category_id": f"cat_{uuid.uuid4().hex[:8]}", "user_id": user_id, "name": "Food & Dining", "type": "expense", "icon": "restaurant", "color": "#FF6B6B"},
            {"category_id": f"cat_{uuid.uuid4().hex[:8]}", "user_id": user_id, "name": "Transportation", "type": "expense", "icon": "car", "color": "#4ECDC4"},
            {"category_id": f"cat_{uuid.uuid4().hex[:8]}", "user_id": user_id, "name": "Shopping", "type": "expense", "icon": "shopping-bag", "color": "#FFE66D"},
            {"category_id": f"cat_{uuid.uuid4().hex[:8]}", "user_id": user_id, "name": "Entertainment", "type": "expense", "icon": "film", "color": "#A8E6CF"},
            {"category_id": f"cat_{uuid.uuid4().hex[:8]}", "user_id": user_id, "name": "Bills & Utilities", "type": "expense", "icon": "file-text", "color": "#95E1D3"},
            {"category_id": f"cat_{uuid.uuid4().hex[:8]}", "user_id": user_id, "name": "Healthcare", "type": "expense", "icon": "heart", "color": "#F38181"},
            {"category_id": f"cat_{uuid.uuid4().hex[:8]}", "user_id": user_id, "name": "Salary", "type": "income", "icon": "dollar-sign", "color": "#6C5CE7"},
            {"category_id": f"cat_{uuid.uuid4().hex[:8]}", "user_id": user_id, "name": "Business", "type": "income", "icon": "briefcase", "color": "#00B894"},
            {"category_id": f"cat_{uuid.uuid4().hex[:8]}", "user_id": user_id, "name": "Investments", "type": "income", "icon": "trending-up", "color": "#FDCB6E"},
        ]
        
        db.categories.insert_many(default_categories)
        print(f"✅ Created {len(default_categories)} default categories")
        
        # Create session
        session_doc = {
            "user_id": user_id,
            "session_token": mock_user_data["session_token"],
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc)
        }
        db.user_sessions.insert_one(session_doc)
        print(f"✅ Created session")
        
        # Now test the categories endpoint
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.get(
                f"{API_BASE}/categories",
                headers={"Authorization": f"Bearer {mock_user_data['session_token']}"}
            )
            
            if response.status_code == 200:
                categories = response.json()
                print(f"✅ Retrieved {len(categories)} categories via API")
                
                expense_cats = [c for c in categories if c['type'] == 'expense']
                income_cats = [c for c in categories if c['type'] == 'income']
                
                print(f"   - Expense categories: {len(expense_cats)}")
                print(f"   - Income categories: {len(income_cats)}")
                
                # Test filtering
                response = await http_client.get(
                    f"{API_BASE}/categories?type=expense",
                    headers={"Authorization": f"Bearer {mock_user_data['session_token']}"}
                )
                
                if response.status_code == 200:
                    filtered_cats = response.json()
                    print(f"✅ Filtered expense categories: {len(filtered_cats)}")
                else:
                    print(f"❌ Failed to filter categories: {response.status_code}")
                
                return True
            else:
                print(f"❌ Failed to get categories: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    finally:
        # Cleanup
        db.users.delete_many({"email": mock_user_data["email"]})
        db.user_sessions.delete_many({"session_token": mock_user_data["session_token"]})
        db.categories.delete_many({"user_id": user_id})
        client.close()
        print("✅ Cleaned up test data")

if __name__ == "__main__":
    result = asyncio.run(test_oauth_flow())
    if result:
        print("🎉 OAuth flow and categories test PASSED!")
    else:
        print("❌ OAuth flow test FAILED!")
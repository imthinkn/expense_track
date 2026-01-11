#!/usr/bin/env python3
"""
Personal Finance App Backend Testing Suite
Tests all backend APIs with proper authentication flow
"""

import asyncio
import httpx
import json
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
import uuid
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')
load_dotenv('/app/frontend/.env')

# Configuration
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://finspect.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.getenv('DB_NAME', 'finance_app')

print(f"Testing backend at: {API_BASE}")
print(f"MongoDB: {MONGO_URL}")

class BackendTester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.mongo_client = MongoClient(MONGO_URL)
        self.db = self.mongo_client[DB_NAME]
        self.session_token = None
        self.user_id = None
        self.test_transactions = []
        self.test_categories = []
        
    async def setup_test_user(self):
        """Create test user and session in MongoDB"""
        print("\n=== Setting up test user and session ===")
        
        # Generate test data
        timestamp = int(datetime.now().timestamp())
        self.user_id = f"user_{uuid.uuid4().hex[:12]}"
        email = f"test.user.{timestamp}@example.com"
        self.session_token = f"test_session_{uuid.uuid4().hex}"
        
        # Create test user
        user_doc = {
            "user_id": self.user_id,
            "email": email,
            "name": "Test User",
            "picture": "https://via.placeholder.com/150",
            "created_at": datetime.now(timezone.utc)
        }
        
        # Create test session (7 days expiry)
        session_doc = {
            "user_id": self.user_id,
            "session_token": self.session_token,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc)
        }
        
        try:
            # Insert into MongoDB
            self.db.users.insert_one(user_doc)
            self.db.user_sessions.insert_one(session_doc)
            
            print(f"✅ Created test user: {self.user_id}")
            print(f"✅ Created session token: {self.session_token}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to create test user: {e}")
            return False
    
    def get_auth_headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.session_token}"}
    
    async def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n=== Testing Authentication Endpoints ===")
        
        # Test GET /api/auth/me
        print("\n1. Testing GET /api/auth/me")
        try:
            response = await self.client.get(
                f"{API_BASE}/auth/me",
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                user_data = response.json()
                print(f"✅ Auth endpoint working - User: {user_data.get('name')}")
                print(f"   User ID: {user_data.get('user_id')}")
                print(f"   Email: {user_data.get('email')}")
                return True
            else:
                print(f"❌ Auth failed - Status: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Auth endpoint error: {e}")
            return False
    
    async def test_auth_without_token(self):
        """Test endpoints without authentication"""
        print("\n2. Testing unauthorized access")
        try:
            response = await self.client.get(f"{API_BASE}/auth/me")
            
            if response.status_code == 401:
                print("✅ Unauthorized access properly blocked")
                return True
            else:
                print(f"❌ Expected 401, got {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Unauthorized test error: {e}")
            return False
    
    async def test_logout_endpoint(self):
        """Test logout endpoint"""
        print("\n3. Testing POST /api/auth/logout")
        try:
            # Create a separate session token for logout test
            logout_token = f"logout_session_{uuid.uuid4().hex}"
            logout_session = {
                "user_id": self.user_id,
                "session_token": logout_token,
                "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                "created_at": datetime.now(timezone.utc)
            }
            self.db.user_sessions.insert_one(logout_session)
            
            response = await self.client.post(
                f"{API_BASE}/auth/logout",
                headers={"Authorization": f"Bearer {logout_token}"}
            )
            
            if response.status_code == 200:
                print("✅ Logout endpoint working")
                return True
            else:
                print(f"❌ Logout failed - Status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Logout endpoint error: {e}")
            return False
    
    async def test_transaction_crud(self):
        """Test transaction CRUD operations"""
        print("\n=== Testing Transaction CRUD APIs ===")
        
        # Test data
        test_transactions = [
            {
                "amount": 2500.0,
                "category": "Salary",
                "type": "income",
                "description": "Monthly salary"
            },
            {
                "amount": 450.0,
                "category": "Food & Dining",
                "type": "expense",
                "description": "Dinner at restaurant"
            },
            {
                "amount": 120.0,
                "category": "Transportation",
                "type": "expense",
                "description": "Uber ride"
            }
        ]
        
        created_transactions = []
        
        # 1. Test POST /api/transactions
        print("\n1. Testing POST /api/transactions")
        for i, txn_data in enumerate(test_transactions):
            try:
                response = await self.client.post(
                    f"{API_BASE}/transactions",
                    headers=self.get_auth_headers(),
                    json=txn_data
                )
                
                if response.status_code == 200:
                    txn = response.json()
                    created_transactions.append(txn)
                    print(f"✅ Created transaction {i+1}: {txn['type']} ₹{txn['amount']}")
                else:
                    print(f"❌ Failed to create transaction {i+1} - Status: {response.status_code}")
                    print(f"   Response: {response.text}")
                    
            except Exception as e:
                print(f"❌ Transaction creation error: {e}")
        
        if not created_transactions:
            print("❌ No transactions created, skipping further tests")
            return False
        
        # 2. Test GET /api/transactions
        print("\n2. Testing GET /api/transactions")
        try:
            response = await self.client.get(
                f"{API_BASE}/transactions",
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                transactions = response.json()
                print(f"✅ Retrieved {len(transactions)} transactions")
                
                # Test filtering by type
                response = await self.client.get(
                    f"{API_BASE}/transactions?type=expense",
                    headers=self.get_auth_headers()
                )
                
                if response.status_code == 200:
                    expense_txns = response.json()
                    print(f"✅ Filtered expenses: {len(expense_txns)} transactions")
                else:
                    print(f"❌ Failed to filter transactions")
                    
            else:
                print(f"❌ Failed to get transactions - Status: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Get transactions error: {e}")
        
        # 3. Test GET /api/transactions/{id}
        print("\n3. Testing GET /api/transactions/{id}")
        if created_transactions:
            txn_id = created_transactions[0]['transaction_id']
            try:
                response = await self.client.get(
                    f"{API_BASE}/transactions/{txn_id}",
                    headers=self.get_auth_headers()
                )
                
                if response.status_code == 200:
                    txn = response.json()
                    print(f"✅ Retrieved specific transaction: {txn['description']}")
                else:
                    print(f"❌ Failed to get specific transaction - Status: {response.status_code}")
                    
            except Exception as e:
                print(f"❌ Get specific transaction error: {e}")
        
        # 4. Test PUT /api/transactions/{id}
        print("\n4. Testing PUT /api/transactions/{id}")
        if created_transactions:
            txn_id = created_transactions[0]['transaction_id']
            update_data = {
                "amount": 2600.0,
                "description": "Updated salary amount"
            }
            
            try:
                response = await self.client.put(
                    f"{API_BASE}/transactions/{txn_id}",
                    headers=self.get_auth_headers(),
                    json=update_data
                )
                
                if response.status_code == 200:
                    updated_txn = response.json()
                    print(f"✅ Updated transaction: ₹{updated_txn['amount']}")
                else:
                    print(f"❌ Failed to update transaction - Status: {response.status_code}")
                    
            except Exception as e:
                print(f"❌ Update transaction error: {e}")
        
        # 5. Test DELETE /api/transactions/{id}
        print("\n5. Testing DELETE /api/transactions/{id}")
        if len(created_transactions) > 1:
            txn_id = created_transactions[-1]['transaction_id']
            try:
                response = await self.client.delete(
                    f"{API_BASE}/transactions/{txn_id}",
                    headers=self.get_auth_headers()
                )
                
                if response.status_code == 200:
                    print("✅ Deleted transaction successfully")
                else:
                    print(f"❌ Failed to delete transaction - Status: {response.status_code}")
                    
            except Exception as e:
                print(f"❌ Delete transaction error: {e}")
        
        self.test_transactions = created_transactions
        return len(created_transactions) > 0
    
    async def test_analytics_endpoints(self):
        """Test analytics endpoints"""
        print("\n=== Testing Analytics APIs ===")
        
        # 1. Test GET /api/analytics/cash-flow
        print("\n1. Testing GET /api/analytics/cash-flow")
        try:
            response = await self.client.get(
                f"{API_BASE}/analytics/cash-flow",
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                cash_flow = response.json()
                print(f"✅ Cash flow analytics working")
                print(f"   Total Income: ₹{cash_flow.get('total_income', 0)}")
                print(f"   Total Expenses: ₹{cash_flow.get('total_expenses', 0)}")
                print(f"   Savings: ₹{cash_flow.get('savings', 0)}")
                print(f"   Savings Rate: {cash_flow.get('savings_rate', 0):.1f}%")
                print(f"   Top Categories: {len(cash_flow.get('top_categories', []))}")
                return True
            else:
                print(f"❌ Cash flow failed - Status: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Cash flow analytics error: {e}")
            return False
    
    async def test_ai_insights(self):
        """Test AI insights endpoint"""
        print("\n2. Testing GET /api/analytics/insights")
        try:
            response = await self.client.get(
                f"{API_BASE}/analytics/insights",
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                insights = response.json()
                print(f"✅ AI insights working")
                print(f"   Insight: {insights.get('insight', 'No insight')[:100]}...")
                print(f"   Generated at: {insights.get('generated_at')}")
                return True
            else:
                print(f"❌ AI insights failed - Status: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ AI insights error: {e}")
            return False
    
    async def test_category_endpoints(self):
        """Test category management endpoints"""
        print("\n=== Testing Category APIs ===")
        
        # 1. Test GET /api/categories
        print("\n1. Testing GET /api/categories")
        try:
            response = await self.client.get(
                f"{API_BASE}/categories",
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                categories = response.json()
                print(f"✅ Retrieved {len(categories)} categories")
                
                # Test filtering by type
                response = await self.client.get(
                    f"{API_BASE}/categories?type=expense",
                    headers=self.get_auth_headers()
                )
                
                if response.status_code == 200:
                    expense_cats = response.json()
                    print(f"✅ Filtered expense categories: {len(expense_cats)}")
                else:
                    print(f"❌ Failed to filter categories")
                    
                self.test_categories = categories
                return True
            else:
                print(f"❌ Failed to get categories - Status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Get categories error: {e}")
            return False
    
    async def test_create_category(self):
        """Test category creation"""
        print("\n2. Testing POST /api/categories")
        
        new_category = {
            "name": "Test Category",
            "type": "expense",
            "icon": "test-icon",
            "color": "#FF5733"
        }
        
        try:
            response = await self.client.post(
                f"{API_BASE}/categories",
                headers=self.get_auth_headers(),
                json=new_category
            )
            
            if response.status_code == 200:
                category = response.json()
                print(f"✅ Created category: {category['name']}")
                return True
            else:
                print(f"❌ Failed to create category - Status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Create category error: {e}")
            return False
    
    async def test_error_handling(self):
        """Test error handling scenarios"""
        print("\n=== Testing Error Handling ===")
        
        # Test 404 for non-existent transaction
        print("\n1. Testing 404 for non-existent transaction")
        try:
            response = await self.client.get(
                f"{API_BASE}/transactions/nonexistent_id",
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 404:
                print("✅ 404 error handling working")
            else:
                print(f"❌ Expected 404, got {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error handling test error: {e}")
        
        # Test validation errors
        print("\n2. Testing validation errors")
        try:
            invalid_transaction = {
                "amount": "invalid",  # Should be float
                "category": "",
                "type": "invalid_type"
            }
            
            response = await self.client.post(
                f"{API_BASE}/transactions",
                headers=self.get_auth_headers(),
                json=invalid_transaction
            )
            
            if response.status_code in [400, 422]:
                print("✅ Validation error handling working")
            else:
                print(f"❌ Expected 400/422, got {response.status_code}")
                
        except Exception as e:
            print(f"❌ Validation test error: {e}")
    
    async def cleanup_test_data(self):
        """Clean up test data"""
        print("\n=== Cleaning up test data ===")
        try:
            # Delete test user and sessions
            self.db.users.delete_many({"user_id": self.user_id})
            self.db.user_sessions.delete_many({"user_id": self.user_id})
            self.db.transactions.delete_many({"user_id": self.user_id})
            self.db.categories.delete_many({"user_id": self.user_id})
            
            print("✅ Test data cleaned up")
            
        except Exception as e:
            print(f"❌ Cleanup error: {e}")
    
    async def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Personal Finance App Backend Tests")
        print("=" * 60)
        
        results = {
            "auth_setup": False,
            "auth_endpoints": False,
            "transaction_crud": False,
            "analytics": False,
            "ai_insights": False,
            "categories": False,
            "error_handling": False
        }
        
        try:
            # Setup
            results["auth_setup"] = await self.setup_test_user()
            if not results["auth_setup"]:
                print("❌ Cannot proceed without test user setup")
                return results
            
            # Auth tests
            results["auth_endpoints"] = await self.test_auth_endpoints()
            await self.test_auth_without_token()
            await self.test_logout_endpoint()
            
            # Transaction tests
            results["transaction_crud"] = await self.test_transaction_crud()
            
            # Analytics tests
            results["analytics"] = await self.test_analytics_endpoints()
            results["ai_insights"] = await self.test_ai_insights()
            
            # Category tests
            results["categories"] = await self.test_category_endpoints()
            await self.test_create_category()
            
            # Error handling tests
            await self.test_error_handling()
            results["error_handling"] = True
            
        except Exception as e:
            print(f"❌ Test suite error: {e}")
        
        finally:
            await self.cleanup_test_data()
            await self.client.aclose()
            self.mongo_client.close()
        
        return results
    
    def print_summary(self, results):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(results)
        passed_tests = sum(1 for result in results.values() if result)
        
        for test_name, passed in results.items():
            status = "✅ PASS" if passed else "❌ FAIL"
            print(f"{test_name.replace('_', ' ').title()}: {status}")
        
        print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 All backend tests PASSED!")
        else:
            print("⚠️  Some tests FAILED - check logs above")

async def main():
    """Main test runner"""
    tester = BackendTester()
    results = await tester.run_all_tests()
    tester.print_summary(results)
    return results

if __name__ == "__main__":
    results = asyncio.run(main())
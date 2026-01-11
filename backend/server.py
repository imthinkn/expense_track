from fastapi import FastAPI, APIRouter, HTTPException, Header, Response, Request, Cookie
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Get Emergent LLM key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', 'sk-emergent-7A8C33dB2CfDe252a5')

# ============ MODELS ============

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: str
    session_token: str

class Transaction(BaseModel):
    transaction_id: str
    user_id: str
    amount: float
    category: str
    type: str  # income or expense
    description: Optional[str] = None
    date: datetime
    tags: List[str] = []
    created_at: datetime

class TransactionCreate(BaseModel):
    amount: float
    category: str
    type: str
    description: Optional[str] = None
    date: Optional[datetime] = None
    tags: List[str] = []

class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    tags: Optional[List[str]] = None

class Category(BaseModel):
    category_id: str
    user_id: str
    name: str
    type: str  # income or expense
    icon: Optional[str] = None
    color: Optional[str] = None

class CategoryCreate(BaseModel):
    name: str
    type: str
    icon: Optional[str] = None
    color: Optional[str] = None

class CashFlowSummary(BaseModel):
    total_income: float
    total_expenses: float
    savings: float
    savings_rate: float
    top_categories: List[Dict[str, Any]]

class InsightResponse(BaseModel):
    insight: str
    generated_at: datetime

# ============ AUTH HELPERS ============

async def get_current_user(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)) -> User:
    """Get current user from session token (cookie or Authorization header)"""
    token = None
    
    # Try to get token from cookie first, then from Authorization header
    if session_token:
        token = session_token
    elif authorization and authorization.startswith('Bearer '):
        token = authorization.split(' ')[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check if session is expired
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(**user_doc)

# ============ AUTH ROUTES ============

@api_router.post("/auth/session")
async def exchange_session(session_id: str = Header(..., alias="X-Session-ID"), response: Response = None):
    """Exchange session_id for user data and session_token"""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            resp.raise_for_status()
            user_data = resp.json()
        
        # Create or get user
        existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
        
        if not existing_user:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user_doc = {
                "user_id": user_id,
                "email": user_data["email"],
                "name": user_data["name"],
                "picture": user_data.get("picture"),
                "created_at": datetime.now(timezone.utc)
            }
            await db.users.insert_one(user_doc)
            
            # Create default categories for new user
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
            await db.categories.insert_many(default_categories)
        else:
            user_id = existing_user["user_id"]
        
        # Create session
        session_token = user_data["session_token"]
        session_doc = {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc)
        }
        await db.user_sessions.insert_one(session_doc)
        
        # Set cookie
        if response:
            response.set_cookie(
                key="session_token",
                value=session_token,
                httponly=True,
                secure=False,  # Set to True in production
                samesite="lax",
                max_age=7 * 24 * 60 * 60,
                path="/"
            )
        
        return SessionDataResponse(**user_data)
    
    except Exception as e:
        logging.error(f"Session exchange error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/auth/me", response_model=User)
async def get_me(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Get current user info"""
    user = await get_current_user(authorization=authorization, session_token=session_token)
    return user

@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None), response: Response = None):
    """Logout user"""
    token = session_token or (authorization.split(' ')[1] if authorization and authorization.startswith('Bearer ') else None)
    
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    if response:
        response.delete_cookie("session_token", path="/")
    
    return {"message": "Logged out successfully"}

# ============ TRANSACTION ROUTES ============

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(
    transaction: TransactionCreate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Create a new transaction"""
    user = await get_current_user(authorization=authorization, session_token=session_token)
    
    transaction_id = f"txn_{uuid.uuid4().hex[:12]}"
    transaction_doc = {
        "transaction_id": transaction_id,
        "user_id": user.user_id,
        "amount": transaction.amount,
        "category": transaction.category,
        "type": transaction.type,
        "description": transaction.description,
        "date": transaction.date or datetime.now(timezone.utc),
        "tags": transaction.tags,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.transactions.insert_one(transaction_doc)
    return Transaction(**transaction_doc)

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    limit: int = 100,
    type: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get user transactions"""
    user = await get_current_user(authorization=authorization, session_token=session_token)
    
    query = {"user_id": user.user_id}
    if type:
        query["type"] = type
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("date", -1).limit(limit).to_list(limit)
    return [Transaction(**t) for t in transactions]

@api_router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(
    transaction_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get a specific transaction"""
    user = await get_current_user(authorization=authorization, session_token=session_token)
    
    transaction = await db.transactions.find_one(
        {"transaction_id": transaction_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return Transaction(**transaction)

@api_router.put("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(
    transaction_id: str,
    update: TransactionUpdate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Update a transaction"""
    user = await get_current_user(authorization=authorization, session_token=session_token)
    
    # Build update dict
    update_dict = {k: v for k, v in update.dict(exclude_unset=True).items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.transactions.update_one(
        {"transaction_id": transaction_id, "user_id": user.user_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Get updated transaction
    transaction = await db.transactions.find_one(
        {"transaction_id": transaction_id},
        {"_id": 0}
    )
    
    return Transaction(**transaction)

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Delete a transaction"""
    user = await get_current_user(authorization=authorization, session_token=session_token)
    
    result = await db.transactions.delete_one(
        {"transaction_id": transaction_id, "user_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {"message": "Transaction deleted successfully"}

# ============ ANALYTICS ROUTES ============

@api_router.get("/analytics/cash-flow", response_model=CashFlowSummary)
async def get_cash_flow(
    period: str = "month",  # month or year
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get cash flow summary"""
    user = await get_current_user(authorization=authorization, session_token=session_token)
    
    # Calculate date range
    now = datetime.now(timezone.utc)
    if period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:  # year
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Get transactions
    transactions = await db.transactions.find(
        {"user_id": user.user_id, "date": {"$gte": start_date}},
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate totals
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
    savings = total_income - total_expenses
    savings_rate = (savings / total_income * 100) if total_income > 0 else 0
    
    # Top categories
    category_totals = {}
    for t in transactions:
        if t["type"] == "expense":
            category = t["category"]
            category_totals[category] = category_totals.get(category, 0) + t["amount"]
    
    top_categories = sorted(
        [{"name": cat, "amount": amt} for cat, amt in category_totals.items()],
        key=lambda x: x["amount"],
        reverse=True
    )[:5]
    
    return CashFlowSummary(
        total_income=total_income,
        total_expenses=total_expenses,
        savings=savings,
        savings_rate=savings_rate,
        top_categories=top_categories
    )

@api_router.get("/analytics/insights", response_model=InsightResponse)
async def generate_insights(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Generate AI-powered financial insights"""
    user = await get_current_user(authorization=authorization, session_token=session_token)
    
    # Get cash flow data
    now = datetime.now(timezone.utc)
    start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    transactions = await db.transactions.find(
        {"user_id": user.user_id, "date": {"$gte": start_date}},
        {"_id": 0}
    ).to_list(1000)
    
    if not transactions:
        return InsightResponse(
            insight="Start tracking your expenses to get personalized insights!",
            generated_at=datetime.now(timezone.utc)
        )
    
    # Prepare data for AI
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
    
    category_spending = {}
    for t in transactions:
        if t["type"] == "expense":
            cat = t["category"]
            category_spending[cat] = category_spending.get(cat, 0) + t["amount"]
    
    # Generate insights using AI
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"insights_{user.user_id}",
            system_message="You are a friendly personal finance advisor for Indian users. Provide actionable, concise insights based on spending data. Keep responses under 100 words. Be encouraging and helpful."
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Analyze this month's financial data and provide ONE key insight or recommendation:

Income: ₹{total_income:,.2f}
Expenses: ₹{total_expenses:,.2f}
Top spending categories: {', '.join([f'{cat}: ₹{amt:,.2f}' for cat, amt in sorted(category_spending.items(), key=lambda x: x[1], reverse=True)[:3]])}

Provide a specific, actionable insight."""
        
        message = UserMessage(text=prompt)
        insight = await chat.send_message(message)
        
        return InsightResponse(
            insight=insight,
            generated_at=datetime.now(timezone.utc)
        )
    
    except Exception as e:
        logging.error(f"AI insight generation error: {str(e)}")
        # Fallback to rule-based insight
        savings_rate = ((total_income - total_expenses) / total_income * 100) if total_income > 0 else 0
        
        if savings_rate < 10:
            insight = f"Your savings rate is {savings_rate:.1f}%. Try to save at least 20% of your income for a healthy financial future."
        elif savings_rate > 30:
            insight = f"Excellent! You're saving {savings_rate:.1f}% of your income. Consider investing this surplus for long-term growth."
        else:
            top_category = max(category_spending.items(), key=lambda x: x[1]) if category_spending else ("expenses", 0)
            insight = f"You're spending ₹{top_category[1]:,.2f} on {top_category[0]} this month. Look for ways to optimize this category."
        
        return InsightResponse(
            insight=insight,
            generated_at=datetime.now(timezone.utc)
        )

# ============ CATEGORY ROUTES ============

@api_router.get("/categories", response_model=List[Category])
async def get_categories(
    type: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get user categories"""
    user = await get_current_user(authorization=authorization, session_token=session_token)
    
    query = {"user_id": user.user_id}
    if type:
        query["type"] = type
    
    categories = await db.categories.find(query, {"_id": 0}).to_list(100)
    return [Category(**c) for c in categories]

@api_router.post("/categories", response_model=Category)
async def create_category(
    category: CategoryCreate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Create a new category"""
    user = await get_current_user(authorization=authorization, session_token=session_token)
    
    category_id = f"cat_{uuid.uuid4().hex[:8]}"
    category_doc = {
        "category_id": category_id,
        "user_id": user.user_id,
        "name": category.name,
        "type": category.type,
        "icon": category.icon,
        "color": category.color
    }
    
    await db.categories.insert_one(category_doc)
    return Category(**category_doc)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

import requests
import json

BASE_URL = 'http://localhost:5000/api'

def test_health():
    """Test the health check endpoint"""
    print("Testing health check...")
    response = requests.get(f'{BASE_URL}/health')
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_expenses():
    """Test expense endpoints"""
    print("Testing expense endpoints...")
    
    # Get all expenses
    response = requests.get(f'{BASE_URL}/expenses')
    print(f"Get expenses - Status: {response.status_code}")
    expenses = response.json()
    print(f"Found {len(expenses)} expenses")
    
    # Add a new expense
    new_expense = {
        'amount': 500,
        'category': 'סופר',
        'description': 'קניות שבועיות',
        'paidBy': 'אני',
        'isRecurring': False
    }
    
    response = requests.post(f'{BASE_URL}/expenses', json=new_expense)
    print(f"Add expense - Status: {response.status_code}")
    if response.status_code == 201:
        added_expense = response.json()
        print(f"Added expense with ID: {added_expense['id']}")
        
        # Test updating the expense
        update_data = {
            'amount': 550,
            'category': 'סופר',
            'description': 'קניות שבועיות מעודכנות',
            'paidBy': 'אני',
            'isRecurring': False
        }
        
        response = requests.put(f'{BASE_URL}/expenses/{added_expense["id"]}', json=update_data)
        print(f"Update expense - Status: {response.status_code}")
        
        # Test deleting the expense
        response = requests.delete(f'{BASE_URL}/expenses/{added_expense["id"]}')
        print(f"Delete expense - Status: {response.status_code}")
    
    print()

def test_users():
    """Test user endpoints"""
    print("Testing user endpoints...")
    
    # Get all users
    response = requests.get(f'{BASE_URL}/users')
    print(f"Get users - Status: {response.status_code}")
    users = response.json()
    print(f"Current users: {users}")
    
    # Add a new user
    new_user = {'name': 'שותף'}
    response = requests.post(f'{BASE_URL}/users', json=new_user)
    print(f"Add user - Status: {response.status_code}")
    
    # Get users again
    response = requests.get(f'{BASE_URL}/users')
    users = response.json()
    print(f"Users after adding: {users}")
    
    print()

def test_categories():
    """Test category endpoints"""
    print("Testing category endpoints...")
    
    # Get all categories
    response = requests.get(f'{BASE_URL}/categories')
    print(f"Get categories - Status: {response.status_code}")
    categories = response.json()
    print(f"Found {len(categories)} categories")
    
    # Add a new category
    new_category = {
        'name': 'בילויים',
        'icon': 'happy',
        'color': '#FF69B4'
    }
    
    response = requests.post(f'{BASE_URL}/categories', json=new_category)
    print(f"Add category - Status: {response.status_code}")
    
    print()

def test_debts():
    """Test debt endpoints"""
    print("Testing debt endpoints...")
    
    # Get all debts
    response = requests.get(f'{BASE_URL}/debts')
    print(f"Get debts - Status: {response.status_code}")
    debts = response.json()
    print(f"Found {len(debts)} debts")
    
    # Test debt summary for current user
    response = requests.get(f'{BASE_URL}/debts/user/אני/summary')
    print(f"Get debt summary - Status: {response.status_code}")
    if response.status_code == 200:
        summary = response.json()
        print(f"Debt summary: {summary}")
    
    print()

def test_onboarding():
    """Test onboarding endpoints"""
    print("Testing onboarding endpoints...")
    
    # Get onboarding status
    response = requests.get(f'{BASE_URL}/onboarding')
    print(f"Get onboarding status - Status: {response.status_code}")
    status = response.json()
    print(f"Onboarding status: {status}")
    
    print()

if __name__ == '__main__':
    print("Starting API tests...")
    print("=" * 50)
    
    try:
        test_health()
        test_users()
        test_categories()
        test_expenses()
        test_debts()
        test_onboarding()
        
        print("All tests completed!")
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the API. Make sure the Flask server is running on http://localhost:5000")
    except Exception as e:
        print(f"Error during testing: {e}") 
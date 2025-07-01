import requests
import json
import time

BASE_URL = 'http://localhost:5000/api'

class APITester:
    def __init__(self):
        self.access_token = None
        self.refresh_token = None
        self.user_id = None
        self.board_id = None

    def test_health(self):
        """Test the health check endpoint"""
        print("🔍 Testing health check...")
        response = requests.get(f'{BASE_URL}/health')
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        print()

    def test_registration(self):
        """Test user registration"""
        print("📝 Testing user registration...")
        
        user_data = {
            'email': 'test@example.com',
            'username': 'testuser',
            'password': 'testpassword123',
            'first_name': 'Test',
            'last_name': 'User'
        }
        
        response = requests.post(f'{BASE_URL}/auth/register', json=user_data)
        print(f"Registration - Status: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            self.access_token = data['access_token']
            self.refresh_token = data['refresh_token']
            self.user_id = data['user']['id']
            print(f"✅ User registered successfully: {data['user']['username']}")
        else:
            print(f"❌ Registration failed: {response.json()}")
        
        print()

    def test_login(self):
        """Test user login"""
        print("🔐 Testing user login...")
        
        login_data = {
            'email': 'test@example.com',
            'password': 'testpassword123'
        }
        
        response = requests.post(f'{BASE_URL}/auth/login', json=login_data)
        print(f"Login - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            self.access_token = data['access_token']
            self.refresh_token = data['refresh_token']
            self.user_id = data['user']['id']
            print(f"✅ Login successful: {data['user']['username']}")
        else:
            print(f"❌ Login failed: {response.json()}")
        
        print()

    def test_get_current_user(self):
        """Test getting current user"""
        print("👤 Testing get current user...")
        
        headers = {'Authorization': f'Bearer {self.access_token}'}
        response = requests.get(f'{BASE_URL}/auth/me', headers=headers)
        print(f"Get current user - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Current user: {data['user']['first_name']} {data['user']['last_name']}")
        else:
            print(f"❌ Get current user failed: {response.json()}")
        
        print()

    def test_create_board(self):
        """Test board creation"""
        print("📋 Testing board creation...")
        
        headers = {'Authorization': f'Bearer {self.access_token}'}
        board_data = {
            'name': 'Test Board',
            'description': 'A test board for expenses',
            'currency': 'ILS',
            'timezone': 'Asia/Jerusalem'
        }
        
        response = requests.post(f'{BASE_URL}/boards', json=board_data, headers=headers)
        print(f"Create board - Status: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            self.board_id = data['id']
            print(f"✅ Board created: {data['name']} (ID: {data['id']})")
        else:
            print(f"❌ Board creation failed: {response.json()}")
        
        print()

    def test_get_boards(self):
        """Test getting user boards"""
        print("📋 Testing get user boards...")
        
        headers = {'Authorization': f'Bearer {self.access_token}'}
        response = requests.get(f'{BASE_URL}/boards', headers=headers)
        print(f"Get boards - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {len(data['boards'])} boards")
            for board in data['boards']:
                print(f"   - {board['name']} (Role: {board['user_role']})")
        else:
            print(f"❌ Get boards failed: {response.json()}")
        
        print()

    def test_get_board_details(self):
        """Test getting board details"""
        print("📋 Testing get board details...")
        
        headers = {'Authorization': f'Bearer {self.access_token}'}
        response = requests.get(f'{BASE_URL}/boards/{self.board_id}', headers=headers)
        print(f"Get board details - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Board: {data['name']}")
            print(f"   Members: {len(data['members'])}")
            print(f"   Currency: {data['currency']}")
            print(f"   User role: {data['user_role']}")
        else:
            print(f"❌ Get board details failed: {response.json()}")
        
        print()

    def test_create_category(self):
        """Test category creation"""
        print("🏷️ Testing category creation...")
        
        headers = {'Authorization': f'Bearer {self.access_token}'}
        category_data = {
            'name': 'בילויים',
            'icon': 'happy',
            'color': '#FF69B4'
        }
        
        response = requests.post(f'{BASE_URL}/boards/{self.board_id}/categories', json=category_data, headers=headers)
        print(f"Create category - Status: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            print(f"✅ Category created: {data['name']}")
        else:
            print(f"❌ Category creation failed: {response.json()}")
        
        print()

    def test_get_categories(self):
        """Test getting board categories"""
        print("🏷️ Testing get board categories...")
        
        headers = {'Authorization': f'Bearer {self.access_token}'}
        response = requests.get(f'{BASE_URL}/boards/{self.board_id}/categories', headers=headers)
        print(f"Get categories - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {len(data['categories'])} categories")
            for category in data['categories']:
                print(f"   - {category['name']} ({category['color']})")
        else:
            print(f"❌ Get categories failed: {response.json()}")
        
        print()

    def test_create_expense(self):
        """Test expense creation"""
        print("💰 Testing expense creation...")
        
        headers = {'Authorization': f'Bearer {self.access_token}'}
        expense_data = {
            'amount': 500,
            'category': 'חשמל',
            'description': 'חשבון חשמל חודשי',
            'paid_by': self.user_id,
            'is_recurring': True,
            'frequency': 'monthly',
            'tags': ['בית', 'חובה']
        }
        
        response = requests.post(f'{BASE_URL}/boards/{self.board_id}/expenses', json=expense_data, headers=headers)
        print(f"Create expense - Status: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            print(f"✅ Expense created: ₪{data['amount']} - {data['category']}")
        else:
            print(f"❌ Expense creation failed: {response.json()}")
        
        print()

    def test_get_expenses(self):
        """Test getting board expenses"""
        print("💰 Testing get board expenses...")
        
        headers = {'Authorization': f'Bearer {self.access_token}'}
        response = requests.get(f'{BASE_URL}/boards/{self.board_id}/expenses', headers=headers)
        print(f"Get expenses - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {len(data['expenses'])} expenses")
            total = sum(expense['amount'] for expense in data['expenses'])
            print(f"   Total: ₪{total}")
        else:
            print(f"❌ Get expenses failed: {response.json()}")
        
        print()

    def test_get_debts(self):
        """Test getting board debts"""
        print("💳 Testing get board debts...")
        
        headers = {'Authorization': f'Bearer {self.access_token}'}
        response = requests.get(f'{BASE_URL}/boards/{self.board_id}/debts', headers=headers)
        print(f"Get debts - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {len(data['debts'])} debts")
            unpaid = sum(debt['amount'] for debt in data['debts'] if not debt['is_paid'])
            print(f"   Unpaid total: ₪{unpaid}")
        else:
            print(f"❌ Get debts failed: {response.json()}")
        
        print()

    def test_invite_member(self):
        """Test inviting a member"""
        print("👥 Testing member invitation...")
        
        headers = {'Authorization': f'Bearer {self.access_token}'}
        invite_data = {
            'email': 'member@example.com',
            'role': 'member'
        }
        
        response = requests.post(f'{BASE_URL}/boards/{self.board_id}/members', json=invite_data, headers=headers)
        print(f"Invite member - Status: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            print(f"✅ {data['message']}")
        else:
            print(f"❌ Invite member failed: {response.json()}")
        
        print()

    def test_get_members(self):
        """Test getting board members"""
        print("👥 Testing get board members...")
        
        headers = {'Authorization': f'Bearer {self.access_token}'}
        response = requests.get(f'{BASE_URL}/boards/{self.board_id}/members', headers=headers)
        print(f"Get members - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {len(data['members'])} members")
            for member in data['members']:
                user = member['user']
                print(f"   - {user['first_name']} {user['last_name']} ({member['role']})")
        else:
            print(f"❌ Get members failed: {response.json()}")
        
        print()

    def test_token_refresh(self):
        """Test token refresh"""
        print("🔄 Testing token refresh...")
        
        headers = {'Authorization': f'Bearer {self.refresh_token}'}
        response = requests.post(f'{BASE_URL}/auth/refresh', headers=headers)
        print(f"Refresh token - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            self.access_token = data['access_token']
            print(f"✅ Token refreshed successfully")
        else:
            print(f"❌ Token refresh failed: {response.json()}")
        
        print()

    def test_rate_limiting(self):
        """Test rate limiting"""
        print("⏱️ Testing rate limiting...")
        
        headers = {'Authorization': f'Bearer {self.access_token}'}
        
        # Try to make many requests quickly
        for i in range(15):
            response = requests.get(f'{BASE_URL}/auth/me', headers=headers)
            if response.status_code == 429:
                print(f"✅ Rate limiting working (blocked after {i+1} requests)")
                break
            time.sleep(0.1)
        else:
            print("⚠️ Rate limiting not triggered")
        
        print()

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Professional API Tests")
        print("=" * 60)
        
        try:
            self.test_health()
            self.test_registration()
            self.test_login()
            self.test_get_current_user()
            self.test_create_board()
            self.test_get_boards()
            self.test_get_board_details()
            self.test_create_category()
            self.test_get_categories()
            self.test_create_expense()
            self.test_get_expenses()
            self.test_get_debts()
            self.test_invite_member()
            self.test_get_members()
            self.test_token_refresh()
            self.test_rate_limiting()
            
            print("🎉 All tests completed successfully!")
            
        except requests.exceptions.ConnectionError:
            print("❌ Error: Could not connect to the API. Make sure the Flask server is running on http://localhost:5000")
        except Exception as e:
            print(f"❌ Error during testing: {e}")

if __name__ == '__main__':
    tester = APITester()
    tester.run_all_tests() 
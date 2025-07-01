# Homis - Hebrew Expense Management App

A React Native mobile application for managing shared expenses with a professional multi-tenant backend.

## 🚀 Features

### 🔐 Authentication
- User registration and login
- JWT-based authentication with refresh tokens
- Secure password handling
- Automatic token refresh

### 🏢 Multi-Board System
- Create and manage multiple expense boards
- Board selection and switching
- Role-based permissions (Owner, Admin, Member, Viewer)
- Board member invitations

### 💰 Expense Management
- Add expenses with categories and descriptions
- Automatic debt calculation among board members
- Recurring expense support
- Tag system for better organization
- Receipt upload support

### 📊 Debt Tracking
- Real-time debt calculation
- Mark debts as paid
- Debt history and status tracking
- Visual debt flow indicators

### 👥 Member Management
- Invite members to boards
- Role-based access control
- Member removal (for admins/owners)
- Member activity tracking

### 🎨 Modern UI/UX
- Hebrew RTL support
- Beautiful, intuitive interface
- Responsive design
- Dark/light theme support

## 🛠️ Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS) or Android Emulator (for Android)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Run on device/simulator:**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your phone

### Backend Setup

Make sure the Flask backend is running on `http://localhost:5000` before using the app.

## 📱 App Structure

### Screens
- **LoginScreen**: User authentication and registration
- **BoardSelectionScreen**: Board management and selection
- **HomeScreen**: Main dashboard with expenses overview
- **AddExpenseScreen**: Add new expenses
- **DebtsScreen**: View and manage debts
- **SettingsScreen**: Board settings and member management

### Contexts
- **AuthContext**: Manages user authentication state
- **BoardContext**: Manages board selection and board-related data

### Services
- **api.ts**: Complete API service with all backend communication

## 🔧 Configuration

### API Configuration
The app connects to the backend at `http://localhost:5000/api`. To change this:

1. Edit `services/api.ts`
2. Update the `API_BASE_URL` constant

### Environment Variables
Create a `.env` file in the root directory:
```env
API_BASE_URL=http://localhost:5000/api
```

## 📱 Navigation Flow

1. **Login/Register** → User authentication
2. **Board Selection** → Choose or create a board
3. **Main App** → Tab-based navigation:
   - **Home**: View expenses and summary
   - **Debts**: Manage debts between members
   - **Settings**: Board settings and members

## 🎯 Key Features

### Multi-Tenant Architecture
- Each board is isolated with its own expenses and members
- Users can be part of multiple boards with different roles
- Secure data separation between boards

### Real-time Updates
- Automatic refresh of data when returning to screens
- Pull-to-refresh functionality
- Optimistic UI updates

### Hebrew Support
- Full RTL (Right-to-Left) text support
- Hebrew date formatting
- Hebrew currency display (ILS)

### Role-Based Permissions
- **Owner**: Full control over board
- **Admin**: Can manage expenses and members
- **Member**: Can add expenses and view data
- **Viewer**: Read-only access

## 🔒 Security Features

- JWT token authentication
- Automatic token refresh
- Secure storage of credentials
- Input validation and sanitization
- Error handling and user feedback

## 📊 Data Management

### Local Storage
- Authentication tokens
- User preferences
- Offline data caching

### API Integration
- RESTful API communication
- Automatic error handling
- Request/response interceptors
- Rate limiting support

## 🎨 UI Components

### Design System
- Consistent color scheme
- Typography hierarchy
- Spacing and layout standards
- Interactive elements

### Components
- Custom buttons and inputs
- Modal dialogs
- Loading states
- Error messages
- Success confirmations

## 🚀 Deployment

### Expo Build
```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android
```

### App Store Deployment
1. Configure app.json with your app details
2. Build the app using Expo
3. Submit to App Store/Google Play

## 🧪 Testing

### Manual Testing
- Test all user flows
- Verify authentication
- Check board management
- Test expense creation
- Verify debt calculations

### Automated Testing
```bash
# Run tests (when implemented)
npm test
```

## 📈 Performance

- Optimized re-renders
- Efficient data loading
- Image optimization
- Memory management
- Network request optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the API documentation
- Create an issue in the repository

## 🔄 Updates

### Version History
- **v1.0.0**: Initial release with core features
- Multi-board support
- Authentication system
- Expense management
- Debt tracking

### Future Features
- Push notifications
- Offline support
- Advanced reporting
- Export functionality
- Multi-currency support

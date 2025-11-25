// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './layouts/Layout.jsx'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Login from './pages/Login'
import Signup from './pages/Signup'
import NotFound from './pages/NotFound'
import Account from './pages/Account'
import Visual from './pages/Visual'
import Oneday from './pages/Oneday'
import TestInfra from './pages/TestInfra'
import TestStates from './pages/TestStates'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { UserRoleProvider } from './contexts/UserRoleContext.jsx'

export default function App() {
  return (
    <AuthProvider>
      <UserRoleProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="cart" element={<Cart />} />
            <Route path="visual" element={<Visual />} />
            <Route path="oneday" element={<Oneday />} />
            <Route path="test-infra" element={<TestInfra />} />
            <Route path="test-states" element={<TestStates />} />
            <Route
              path="account"
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </UserRoleProvider>
    </AuthProvider>
  )
}

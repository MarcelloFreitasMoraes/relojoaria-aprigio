import { Route, Routes, Navigate } from 'react-router-dom'
import { LoginPage } from './routes/LoginPage'
import { OrdersListPage } from './routes/OrdersListPage'
import { OrderFormPage } from './routes/OrderFormPage'
import { OrderPrintPage } from './routes/OrderPrintPage'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { UsersListPage } from './routes/UsersListPage'

function App() {
  return (
    <Routes>
      {/* Rota inicial sempre leva para a tela de login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <OrdersListPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <UsersListPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/orders/new"
        element={
          <ProtectedRoute>
            <OrderFormPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/orders/cliente/:clienteId/edit"
        element={
          <ProtectedRoute>
            <OrderFormPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/orders/:id/edit"
        element={
          <ProtectedRoute>
            <OrderFormPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/orders/:id/print"
        element={
          <ProtectedRoute>
            <OrderPrintPage />
          </ProtectedRoute>
        }
      />

      {/* Qualquer rota desconhecida também redireciona para login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App

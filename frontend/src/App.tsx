import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Generate from './pages/Generate'
import Backtest from './pages/Backtest'
import TopStrategies from './pages/TopStrategies'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/backtest" element={<Backtest />} />
          <Route path="/strategies" element={<TopStrategies />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

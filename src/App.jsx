import { Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import Admin from "./pages/Admin"
import SectorPage from "./pages/SectorPage"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/sector/:id" element={<SectorPage />} />
    </Routes>
  )
}

export default App

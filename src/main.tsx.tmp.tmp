import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import "./index.css"
import { AuthProvider, useAuth } from "./lib/auth"
import Layout from "./components/Layout"
import AdminLayout from "./components/AdminLayout"
import Home from "./pages/Home"
import Onboarding from "./pages/Onboarding"
import Directory from "./pages/Directory"
import EntityDetail from "./pages/EntityDetail"
import Blog from "./pages/Blog"
import BlogPost from "./pages/BlogPost"
import NotFound from "./pages/NotFound"
import Login from "./pages/admin/Login"
import Dashboard from "./pages/admin/Dashboard"
import MyEntity from "./pages/admin/MyEntity"
import MyPrograms from "./pages/admin/MyPrograms"
import MyPosts from "./pages/admin/MyPosts"
import Leads from "./pages/admin/Leads"
import Stats from "./pages/admin/Stats"
import AdminEntities from "./pages/admin/AdminEntities"
import AdminUsers from "./pages/admin/AdminUsers"

function RequireSuperadmin({ children }: { children: React.ReactNode }) {
  const { loading, isSuperadmin } = useAuth()
  if (loading) return null
  if (!isSuperadmin) return <Navigate to="/admin" replace />
  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/empezar" element={<Onboarding />} />
            <Route path="/entidades" element={<Directory />} />
            <Route path="/entidades/:slug" element={<EntityDetail />} />
            <Route path="/noticias" element={<Blog />} />
            <Route path="/noticias/:slug" element={<BlogPost />} />
          </Route>

          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="entidad" element={<MyEntity />} />
            <Route path="programas" element={<MyPrograms />} />
            <Route path="noticias" element={<MyPosts />} />
            <Route path="leads" element={<RequireSuperadmin><Leads /></RequireSuperadmin>} />
            <Route path="estadisticas" element={<RequireSuperadmin><Stats /></RequireSuperadmin>} />
            <Route path="entidades" element={<RequireSuperadmin><AdminEntities /></RequireSuperadmin>} />
            <Route path="usuarios" element={<RequireSuperadmin><AdminUsers /></RequireSuperadmin>} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
)

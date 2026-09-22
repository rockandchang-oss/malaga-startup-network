import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom"
import { useEffect as useEffectRR } from "react"
import "./index.css"
import { AuthProvider, useAuth } from "./lib/auth"
import { supabase as supabaseCliente } from "./lib/supabase"
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
import Clave from "./pages/admin/Clave"
import Dashboard from "./pages/admin/Dashboard"
import MyEntity from "./pages/admin/MyEntity"
import MyPrograms from "./pages/admin/MyPrograms"
import MyPosts from "./pages/admin/MyPosts"
import Leads from "./pages/admin/Leads"
import Stats from "./pages/admin/Stats"
import AdminEntities from "./pages/admin/AdminEntities"
import AdminUsers from "./pages/admin/AdminUsers"
import Revision from "./pages/admin/Revision"

function RedirigirInvitacion() {
  const nav = useNavigate()
  useEffectRR(() => {
    const h = window.location.hash || ""
    const esError = h.indexOf("otp_expired") >= 0 || h.indexOf("access_denied") >= 0
    const esInvit = h.indexOf("type=invite") >= 0 || h.indexOf("type=recovery") >= 0
    if (esError) { nav("/admin/clave" + h, { replace: true }); return }
    if (!esInvit) return
    let hecho = false
    const ir = () => { if (!hecho) { hecho = true; nav("/admin/clave", { replace: true }) } }
    // el cliente de Supabase lee el hash de forma asincrona: esperamos a la sesion
    const { data: sub } = supabaseCliente.auth.onAuthStateChange((_e, sesion) => { if (sesion) ir() })
    supabaseCliente.auth.getSession().then(({ data }) => { if (data.session) ir() })
    const t = setTimeout(() => nav("/admin/clave" + h, { replace: true }), 4000)
    return () => { clearTimeout(t); sub.subscription.unsubscribe() }
  }, [])
  return null
}

function RequireSuperadmin({ children }: { children: React.ReactNode }) {
  const { loading, isSuperadmin } = useAuth()
  if (loading) return null
  if (!isSuperadmin) return <Navigate to="/admin" replace />
  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.VITE_BASENAME || "/"}>
        <RedirigirInvitacion />
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
          <Route path="/admin/clave" element={<Clave />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="entidad" element={<MyEntity />} />
            <Route path="programas" element={<MyPrograms />} />
            <Route path="noticias" element={<MyPosts />} />
            <Route path="leads" element={<RequireSuperadmin><Leads /></RequireSuperadmin>} />
            <Route path="estadisticas" element={<RequireSuperadmin><Stats /></RequireSuperadmin>} />
            <Route path="entidades" element={<RequireSuperadmin><AdminEntities /></RequireSuperadmin>} />
            <Route path="usuarios" element={<RequireSuperadmin><AdminUsers /></RequireSuperadmin>} />
            <Route path="revision" element={<RequireSuperadmin><Revision /></RequireSuperadmin>} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
)

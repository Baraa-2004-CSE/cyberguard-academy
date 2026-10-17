
import { useEffect, useState } from "react";
import Home from "./Home";
import "./App.css";

const API_URL = "http://localhost:5000/api/auth";

export default function App() {
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch(`${API_URL}/me`, {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user ?? data);
        }
      } catch {
        // إذا لم يوجد اتصال، نعرض شاشة الدخول.
      } finally {
        setCheckingSession(false);
      }
    }

    checkSession();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const endpoint =
        mode === "register" ? "/register" : "/login";

      const body =
        mode === "register"
          ? { full_name: fullName, email, password }
          : { email, password };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Could not complete the request"
        );
      }

      if (mode === "register") {
        setMode("login");
        setPassword("");
        setMessage("تم إنشاء الحساب بنجاح. سجّلي الدخول الآن.");
      } else {
        // الانتقال إلى الصفحة Home بعد نجاح الدخول.
        const meResponse = await fetch(`${API_URL}/me`, {
          credentials: "include",
        });

        if (meResponse.ok) {
          const meData = await meResponse.json();
          setUser(meData.user ?? meData);
        } else if (data.user) {
          setUser(data.user);
        } else {
          throw new Error(
            "تم Sign in، لكن تعذّر جلب بيانات المستخدم."
          );
        }
      }
    } catch (error) {
      setMessage(error.message || "تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      setMode("login");
      setPassword("");
      setMessage("تم Log out.");
    }
  }

  if (checkingSession) {
    return <main className="page">جاري التحقق من Sign in...</main>;
  }

  if (user) {
    return <Home user={user} onLogout={handleLogout} />;
  }

  return (
    <main className="page">
      <section className="auth-card">
        <div className="brand-icon">🛡️</div>
        <p className="eyebrow">LEARN • PRACTICE • PROTECT</p>
        <h1>CyberGuard Academy</h1>
        <p className="subtitle">
          منصتك لتعلّم الأمن السيبراني بطريقة عملية وآمنة
        </p>

        <div className="tabs">
          <button
            type="button"
            className={mode === "login" ? "tab active" : "tab"}
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
          >
            Sign in
          </button>

          <button
            type="button"
            className={mode === "register" ? "tab active" : "tab"}
            onClick={() => {
              setMode("register");
              setMessage("");
            }}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <label>
              Full name
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="أدخلي اسمك الكامل"
                autoComplete="name"
                required
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخلي Password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={8}
              required
            />
          </label>

          <button className="submit-btn" type="submit" disabled={loading}>
            {loading
              ? "جاري المعالجة..."
              : mode === "login"
                ? "دخول إلى حسابي"
                : "Create account جديد"}
          </button>
        </form>

        {message && (
          <p className="message" role="status">{message}</p>
        )}

        <p className="footer-text">
          تعلّم الأمن السيبراني، وطبّق مهاراتك بمسؤولية.
        </p>
      </section>
    </main>
  );
}
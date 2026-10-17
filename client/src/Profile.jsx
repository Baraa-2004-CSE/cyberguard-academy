
import { useEffect, useState } from "react";
import "./Profile.css";

const PROFILE_API_URL = "http://localhost:5000/api/auth/profile";

export default function Profile({ user, onBack, onProfileUpdated }) {
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(user?.full_name || "");
    setEmail(user?.email || "");
  }, [user]);

  const initial = fullName.trim().charAt(0) || "م";

  async function handleSave(event) {
    event.preventDefault();

    if (saving) return;

    setMessage("");
    setMessageType("");
    setSaving(true);

    try {
      const response = await fetch(PROFILE_API_URL, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "انتهت جلسة تسجيل الدخول. سجّلي الدخول مجددًا."
          );
        }

        throw new Error(
          data.message || "تعذّر حفظ التعديلات."
        );
      }

      if (!data.user) {
        throw new Error("لم تصل بيانات المستخدم بعد الحفظ.");
      }

      setFullName(data.user.full_name || "");
      setEmail(data.user.email || "");

      if (onProfileUpdated) {
        onProfileUpdated(data.user);
      }

      setMessage(data.message || "تم حفظ التعديلات بنجاح.");
      setMessageType("success");
    } catch (error) {
      console.error("Profile update error:", error);

      setMessage(
        error.message || "تعذّر الاتصال بالسيرفر."
      );
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="profile-page" dir="rtl">
      <header className="profile-header">
        <div>
          <span className="profile-kicker">
            CYBERGUARD ACADEMY
          </span>
          <h1>الملف الشخصي</h1>
          <p>راجعي بيانات حسابك وحدّثي معلوماتك الشخصية.</p>
        </div>

        <button
          type="button"
          className="profile-back-btn"
          onClick={onBack}
        >
          ← العودة للرئيسية
        </button>
      </header>

      <section className="profile-cover">
        <div className="profile-cover-pattern" />

        <div className="profile-avatar">{initial}</div>

        <div className="profile-identity">
          <h2>{fullName || "متعلّمنا"}</h2>
          <p>{email || "لم يُحدّد البريد الإلكتروني"}</p>

          <span className="profile-member-badge">
            🛡️ عضو في CyberGuard Academy
          </span>
        </div>
      </section>

      <div className="profile-layout">
        <section className="profile-card">
          <div className="profile-card-heading">
            <div>
              <h2>المعلومات الشخصية</h2>
              <p>تُحفظ التعديلات في قاعدة البيانات.</p>
            </div>

            <span className="profile-heading-icon">♙</span>
          </div>

          <form onSubmit={handleSave}>
            <div className="profile-form-group">
              <label htmlFor="profile-full-name">
                الاسم الكامل
              </label>

              <input
                id="profile-full-name"
                type="text"
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value);
                  setMessage("");
                  setMessageType("");
                }}
                placeholder="أدخلي الاسم الكامل"
                autoComplete="name"
                minLength={2}
                maxLength={150}
                required
                disabled={saving}
              />
            </div>

            <div className="profile-form-group">
              <label htmlFor="profile-email">
                البريد الإلكتروني
              </label>

              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setMessage("");
                  setMessageType("");
                }}
                placeholder="أدخلي البريد الإلكتروني"
                autoComplete="email"
                maxLength={190}
                required
                disabled={saving}
              />
            </div>

            <div className="profile-form-group">
              <label htmlFor="profile-specialization">
                التخصص
              </label>

             
            </div>

            <div className="profile-form-group">
              <label htmlFor="profile-platform">
                المنصة
              </label>

              <input
                id="profile-platform"
                type="text"
                value="CyberGuard Academy"
                readOnly
              />
            </div>

            {message && (
              <div
                className="profile-message"
                role={messageType === "error" ? "alert" : "status"}
                style={{
                  color:
                    messageType === "success"
                      ? "#15803d"
                      : "#b91c1c",
                }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              className="profile-save-btn"
              disabled={saving}
            >
              {saving ? "جارٍ حفظ التعديلات..." : "حفظ التعديلات"}
            </button>

            <p className="profile-save-note">
              بياناتك محمية، ولا يمكنك تعديل بيانات حساب آخر.
            </p>
          </form>
        </section>

        <aside className="profile-side-column">
          <section className="profile-card profile-security-card">
            <div className="profile-card-heading">
              <div>
                <h2>أمان الحساب</h2>
                <p>حافظي على أمان بياناتك.</p>
              </div>

              <span className="profile-heading-icon">🔐</span>
            </div>

            <div className="profile-security-item">
              <span className="profile-security-icon">🛡️</span>
              <div>
                <strong>حماية الحساب</strong>
                <p>لا تشاركي كلمة المرور مع أي شخص.</p>
              </div>
            </div>

            <div className="profile-security-item">
              <span className="profile-security-icon">📧</span>
              <div>
                <strong>البريد الإلكتروني</strong>
                <p>تأكدي من صحة البريد المرتبط بحسابك.</p>
              </div>
            </div>
          </section>

          <section className="profile-tip-card">
            <span>💡</span>
            <h3>نصيحة أمنية</h3>
            <p>
              استخدمي كلمة مرور قوية وفريدة، وفعّلي المصادقة
              متعددة العوامل عندما تكون متاحة.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}

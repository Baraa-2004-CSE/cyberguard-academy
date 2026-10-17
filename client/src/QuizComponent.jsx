import React, { useState, useEffect } from 'react';
import axios from 'axios';

const QuizComponent = ({ lessonId, isRtl = true }) => {
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // جلب الأسئلة عند تحميل المكون
  useEffect(() => {
    fetchQuiz();
  }, [lessonId]);

  const fetchQuiz = async () => {
    try {
      const response = await axios.get(`/api/quizzes/lesson/${lessonId}`);
      if (response.data.success) {
        // تحويل خيارات السؤال من JSON Text إلى Array إذا كانت مخزنة كنص
        const formattedQuestions = response.data.questions.map((q) => ({
          ...q,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        }));
        setQuestions(formattedQuestions);
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (questionId, optionIndex) => {
    setUserAnswers({
      ...userAnswers,
      [questionId]: optionIndex,
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formattedAnswers = Object.keys(userAnswers).map((qId) => ({
        questionId: parseInt(qId),
        selectedOption: userAnswers[qId],
      }));

      const response = await axios.post(`/api/quizzes/lesson/${lessonId}/submit`, {
        userAnswers: formattedAnswers,
      });

      if (response.data.success) {
        setResult(response.data);
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-4 text-center">جاري تحميل الاختبار...</div>;
  if (questions.length === 0) return null;

  return (
    <div className={`mt-8 p-6 bg-slate-900 border border-slate-800 rounded-xl text-white ${isRtl ? 'rtl' : 'ltr'}`}>
      <h3 className="text-xl font-bold mb-4 text-emerald-400">
        {isRtl ? 'اختبار قصير للتأكد من الفهم' : 'Knowledge Check Quiz'}
      </h3>

      {/* عرض الأسئلة */}
      {!result ? (
        <div className="space-y-6">
          {questions.map((q, qIdx) => (
            <div key={q.id} className="p-4 bg-slate-800/60 rounded-lg border border-slate-700">
              <p className="font-semibold mb-3 text-slate-200">
                {qIdx + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, optIdx) => (
                  <label
                    key={optIdx}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                      userAnswers[q.id] === optIdx
                        ? 'bg-emerald-950/60 border border-emerald-500'
                        : 'bg-slate-900/50 hover:bg-slate-700/50 border border-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${q.id}`}
                      checked={userAnswers[q.id] === optIdx}
                      onChange={() => handleOptionSelect(q.id, optIdx)}
                      className="accent-emerald-500"
                    />
                    <span className="text-sm text-slate-300">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={handleSubmit}
            disabled={submitting || Object.keys(userAnswers).length < questions.length}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-lg transition disabled:opacity-50"
          >
            {submitting ? (isRtl ? 'جاري التصحيح...' : 'Submitting...') : isRtl ? 'إرسال الإجابات' : 'Submit Answers'}
          </button>
        </div>
      ) : (
        /* عرض النتيجة والاجابات الصحيحة والتوضيح */
        <div className="space-y-6">
          <div className="p-4 bg-slate-800 rounded-lg text-center border border-slate-700">
            <h4 className="text-2xl font-extrabold text-emerald-400 mb-1">{result.score}%</h4>
            <p className="text-slate-300 text-sm">
              {isRtl
                ? `حصلت على ${result.correctCount} من أصل ${result.total} إجابات صحيحة`
                : `You scored ${result.correctCount} out of ${result.total}`}
            </p>
          </div>

          <div className="space-y-4">
            {questions.map((q) => {
              const resDetail = result.details.find((d) => d.questionId === q.id);
              const isCorrect = resDetail?.isCorrect;

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-lg border ${
                    isCorrect ? 'bg-emerald-950/30 border-emerald-800' : 'bg-rose-950/30 border-rose-800'
                  }`}
                >
                  <p className="font-semibold text-slate-200 mb-2">{q.question}</p>
                  <p className="text-sm text-slate-300 mb-1">
                    <span className="font-bold">{isRtl ? 'إجابتك: ' : 'Your answer: '}</span>
                    {q.options[userAnswers[q.id]] || (isRtl ? 'لم يتم الإجابة' : 'No answer')}
                  </p>
                  {!isCorrect && (
                    <p className="text-sm text-emerald-400 mb-1">
                      <span className="font-bold">{isRtl ? 'الإجابة الصحيحة: ' : 'Correct answer: '}</span>
                      {q.options[resDetail?.correctAnswer]}
                    </p>
                  )}
                  {resDetail?.explanation && (
                    <div className="mt-2 text-xs bg-slate-900 p-3 rounded border border-slate-800 text-slate-400">
                      💡 <span className="font-bold">{isRtl ? 'الشرح: ' : 'Explanation: '}</span>
                      {resDetail.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => {
              setResult(null);
              setUserAnswers({});
            }}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition"
          >
            {isRtl ? 'إعادة المحاولة' : 'Retake Quiz'}
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizComponent;
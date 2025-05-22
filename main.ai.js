// عناصر الصفحة
const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");

// دالة لإضافة رسالة (الرسائل تظهر مع أنميشن)
function addMessage(text, sender, loading = false) {
  const message = document.createElement("div");
  message.classList.add("chat-message", sender === "user" ? "user-message" : "bot-message");
  if (loading) message.classList.add("loading");
  message.textContent = text;
  chatBox.appendChild(message);
  chatBox.scrollTop = chatBox.scrollHeight;
  return message;
}

// ذاكرتنا للوظائف الأساسية
// تحاول تبسيط أو حل المعادلات أو شرح الدوال
function processInput(input) {
  input = input.replace(/\s+/g, ''); // إزالة الفراغات لتسهيل المعالجة
  let response = "";

  // حاول تعرف هل هي معادلة = ... أم تعبير عادي؟
  if (input.includes("=")) {
    // محاولة حل المعادلة بالنسبة لـ x
    try {
      // استخرج الطرفين
      let sides = input.split("=");
      if(sides.length !== 2) throw new Error("صيغة المعادلة غير صحيحة");
      // ابني معادلة mathjs للطرح حتى تصبح صفر
      let equationStr = `(${sides[0]}) - (${sides[1]})`;
      let equation = math.parse(equationStr);

      // الحل البديل: حل المعادلة خطيًا أو تبسيطها فقط

      function f(x) {
        try {
          return math.evaluate(equationStr, {x: x});
        } catch {
          return NaN;
        }
      }

      // دالة البحث الثنائي للعثور على جذر (حيث f(x)=0)
      function binarySearch(f, low, high, tol=1e-7, maxIter=100) {
        let mid;
        for (let i = 0; i < maxIter; i++) {
          mid = (low + high)/2;
          let val = f(mid);
          if (Math.abs(val) < tol) return mid;
          if (val * f(low) < 0) {
            high = mid;
          } else {
            low = mid;
          }
        }
        return mid;
      }

      // نجرب البحث بين -1e6 و 1e6
      let root = binarySearch(f, -1e6, 1e6);

      if (isNaN(root)) {
        response = "لم أتمكن من إيجاد حل رياضي واضح للمعادلة.";
      } else {
        response = `حل المعادلة (قيمة x) ≈ ${root.toFixed(6)}`;
      }
    } catch (error) {
      response = "خطأ في معالجة المعادلة. الرجاء التأكد من الصيغة.";
    }

  } else {
    // تبسيط التعبير الرياضي
    try {
      let simplified = math.simplify(input).toString();
      response = `الناتج المبسط هو: ${simplified}`;
    } catch {
      response = "لم أفهم التعبير. حاول مرة أخرى بصيغة صحيحة.";
    }
  }

  return response;
}

// إضافة رد البوت مع تحميل وهمي وأنيميشن
async function respondToInput(input) {
  // نضيف رسالة تحميل
  const loadingMsg = addMessage("جارٍ الحساب...", "bot", true);

  // محاكاة تأخير الحساب لراحة المستخدم
  await new Promise(r => setTimeout(r, 900));

  // نحصل على الرد
  const answer = processInput(input);

  // إزالة حالة التحميل
  loadingMsg.classList.remove("loading");
  loadingMsg.textContent = answer;

  // أنيميشن إضافي على رسالة البوت
  anime({
    targets: loadingMsg,
    opacity: [0,1],
    translateY: [-10, 0],
    duration: 600,
    easing: 'easeOutExpo'
  });
}

// حدث إرسال النموذج
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = userInput.value.trim();
  if (!input) return;
  addMessage(input, "user");
  respondToInput(input);
  userInput.value = "";
});

// رسالة ترحيبية تلقائية
window.onload = () => {
  addMessage("مرحبًا! اكتب معادلة أو دالة رياضية، وسأساعدك في حلها أو تبسيطها.", "bot");
};
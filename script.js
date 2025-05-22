// حالة التسجيل أو الدخول
let isRegister = false;

// توليد كابتشا بسيط عشوائي (حروف وأرقام)
function generateCaptcha(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let captcha = '';
  for (let i = 0; i < length; i++) {
    captcha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return captcha;
}

// تحديث الكابتشا في الصفحة
function refreshCaptcha() {
  currentCaptcha = generateCaptcha();
  document.getElementById('captcha-container').textContent = currentCaptcha;
  document.getElementById('captcha-input').value = '';
}

// تحقق من قوة كلمة المرور
function validatePassword(pwd) {
  return (
    pwd.length >= 8 &&
    /[0-9]/.test(pwd) &&
    /[.]/.test(pwd)
  );
}

// عرض رسالة تنبيه
function alertMsg(msg) {
  alert(msg);
}

// عرض اسم المستخدم
function showUserGreeting(email) {
  const userDiv = document.getElementById('user-greeting');
  const username = email.split('@')[0];
  userDiv.textContent = `مرحباً، ${username}`;
}

// التبديل بين تسجيل الدخول وإنشاء حساب
function toggleAuth() {
  isRegister = !isRegister;
  document.getElementById('auth-btn').textContent = isRegister ? 'تسجيل' : 'دخول';
  document.getElementById('toggle-auth').textContent = isRegister ? 'لدي حساب بالفعل' : 'إنشاء حساب جديد';
  document.getElementById('pass-requirements').style.display = isRegister ? 'block' : 'none';
  document.getElementById('captcha-container').style.display = isRegister ? 'block' : 'none';
  document.getElementById('captcha-input').style.display = isRegister ? 'block' : 'none';
  document.getElementById('email').value = '';
  document.getElementById('password').value = '';
  document.getElementById('captcha-input').value = '';
  refreshCaptcha();
}

// تخزين واسترجاع المستخدمين
function saveUser(email, password) {
  localStorage.setItem(`user_${email}`, password);
}
function getUser(email) {
  return localStorage.getItem(`user_${email}`);
}
function userExists(email) {
  return getUser(email) !== null;
}

// زر الدخول / التسجيل
document.getElementById('auth-btn').addEventListener('click', () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const captchaInput = document.getElementById('captcha-input').value.trim();

  if (!email || !password) {
    alertMsg('يرجى ملء كل الحقول المطلوبة');
    return;
  }

  if (isRegister) {
    if (!validatePassword(password)) {
      alertMsg('كلمة المرور يجب أن تكون 8 أحرف على الأقل، تحتوي أرقام ونقاط');
      return;
    }
    if (captchaInput.toUpperCase() !== currentCaptcha) {
      alertMsg('كلمة الكابتشا غير صحيحة، حاول مرة أخرى');
      refreshCaptcha();
      return;
    }
    if (userExists(email)) {
      alertMsg('هذا البريد مسجل مسبقاً، يرجى تسجيل الدخول');
      return;
    }
    saveUser(email, password);
    alertMsg('تم إنشاء الحساب بنجاح، يمكنك الآن تسجيل الدخول');
    toggleAuth();
  } else {
    if (!userExists(email)) {
      alertMsg('هذا البريد غير مسجل');
      return;
    }
    const storedPwd = getUser(email);
    if (storedPwd !== password) {
      alertMsg('كلمة المرور غير صحيحة');
      return;
    }
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('graph-section').style.display = 'block';
    showUserGreeting(email);
  }
});

// تهيئة الكابتشا
document.getElementById('toggle-auth').addEventListener('click', toggleAuth);
document.getElementById('pass-requirements').style.display = 'none';
document.getElementById('captcha-container').style.display = 'none';
document.getElementById('captcha-input').style.display = 'none';

let currentCaptcha = '';
refreshCaptcha();

// رسم الدوال + التوجيه السري
let currentChart = null;
document.getElementById('plot-btn').addEventListener('click', () => {
  const input = document.getElementById('function-input').value.trim();

  if (!input) {
    alertMsg('أدخل دالة واحدة على الأقل');
    return;
  }

  // التحقق من وجود كود سري
  const cleanInput = input.toLowerCase().replace(/\s+/g, '');
  if (cleanInput === 'ai') {
    window.location.href = "https://shdow-pop.github.io/GraphAI.01/";
    return;
  } else if (cleanInput === 'i.m.b') {
    window.location.href = "https://www.instagram.com/ilyes_m.b22?igsh=cms5ZjU4eGk1OTBj";
    return;} else  if (cleanInput === 'a.a.d') {
    window.location.href = "https://www.instagram.com/luffy._.yassine?igsh=b3Vya2VsZG95ZWlo";
    return;} else
    if (cleanInput === 'n.c') {
    window.location.href = "https://www.instagram.com/no_reddin?igsh=MXhmcHI4Yzdyc21l";
    return;
  }

  const functions = input.split('\n').filter(f => f.trim() !== '');
  const labels = [];
  for (let x = -10; x <= 10; x += 0.5) {
    labels.push(x.toFixed(1));
  }

  const datasets = [];
  functions.forEach((fn, idx) => {
    const dataPoints = [];
    for (let x = -10; x <= 10; x += 0.5) {
      try {
        const scope = { x: x };
        let value = math.evaluate(fn, scope);
        if (typeof value !== 'number' || !isFinite(value)) value = null;
        dataPoints.push(value);
      } catch {
        dataPoints.push(null);
      }
    }
    const colors = ['#ff5722', '#03a9f4', '#8bc34a', '#ffeb3b', '#e91e63', '#009688', '#795548'];
    const color = colors[idx % colors.length];
    datasets.push({
      label: fn,
      data: dataPoints,
      borderColor: color,
      backgroundColor: 'transparent',
      borderWidth: 3,
      tension: 0.4,
      spanGaps: true,
      fill: false,
      pointRadius: 0,
      borderJoinStyle: 'round',
    });
  });

  if (currentChart) {
    currentChart.destroy();
  }

  const ctx = document.getElementById('graphCanvas').getContext('2d');
  currentChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: {
      animation: { duration: 1000, easing: 'easeInOutQuart' },
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'x', color: '#ffecb3', font: { weight: 'bold' } },
          ticks: { color: '#fff' },
          grid: { color: 'rgba(255, 236, 179, 0.2)' }
        },
        y: {
          title: { display: true, text: 'y', color: '#ffecb3', font: { weight: 'bold' } },
          ticks: { color: '#fff' },
          grid: { color: 'rgba(255, 236, 179, 0.2)' }
        }
      },
      plugins: {
        legend: { labels: { color: '#fff' }, position: 'top' },
        tooltip: {
          mode: 'nearest',
          intersect: false,
          backgroundColor: '#333',
          titleColor: '#ffa726',
          bodyColor: '#fff',
          cornerRadius: 6,
          displayColors: false,
        }
      }
    }
  });
});

// أزرار التنقل
function goToChat() {
  window.location.href = 'index.ai.html';
}
function goToQR() {
  window.location.href = "qr.html";
}
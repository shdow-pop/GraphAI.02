
    // --- بداية مكتبة QRCode مبسطة نوع 4 (33x33) + تصحيح خطأ متوسط (M) ---

    // تعريف الثوابت
    const QRMode = { MODE_8BIT_BYTE: 4 };
    const QRErrorCorrectionLevel = { L: 1, M: 0, Q: 3, H: 2 };

    // كلاس بيانات 8bit byte
    class QR8bitByte {
      constructor(data) {
        this.mode = QRMode.MODE_8BIT_BYTE;
        this.data = data;
      }
      getLength() {
        return this.data.length;
      }
      write(buffer) {
        for (let i = 0; i < this.data.length; i++) {
          buffer.put(this.data.charCodeAt(i), 8);
        }
      }
    }

    // كلاس Buffer للبتات
    class QRBitBuffer {
      constructor() {
        this.buffer = [];
        this.length = 0;
      }
      get(index) {
        const bufIndex = Math.floor(index / 8);
        return ((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) == 1;
      }
      put(num, length) {
        for (let i = 0; i < length; i++) {
          this.putBit(((num >>> (length - i - 1)) & 1) == 1);
        }
      }
      putBit(bit) {
        const bufIndex = Math.floor(this.length / 8);
        if (this.buffer.length <= bufIndex) this.buffer.push(0);
        if (bit) this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
        this.length++;
      }
    }

    // جداول اللوغاريتم والأسس لـ Reed-Solomon
    const QRMath = {
      EXP_TABLE: new Array(256),
      LOG_TABLE: new Array(256),
      glog(n) {
        if (n < 1) throw new Error("glog(" + n + ")");
        return QRMath.LOG_TABLE[n];
      },
      gexp(n) {
        while (n < 0) n += 255;
        while (n >= 256) n -= 255;
        return QRMath.EXP_TABLE[n];
      }
    };

    for (let i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
    for (let i = 8; i < 256; i++) {
      QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
    }
    for (let i = 0; i < 255; i++) {
      QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;
    }

    // كلاس كثير الحدود Polynomial
    class QRPolynomial {
      constructor(num, shift) {
        let offset = 0;
        while (offset < num.length && num[offset] === 0) offset++;
        this.num = new Array(num.length - offset + shift);
        for (let i = 0; i < num.length - offset; i++) {
          this.num[i] = num[i + offset];
        }
      }
      get(index) {
        return this.num[index];
      }
      getLength() {
        return this.num.length;
      }
      multiply(e) {
        const num = new Array(this.getLength() + e.getLength() - 1).fill(0);
        for (let i = 0; i < this.getLength(); i++) {
          for (let j = 0; j < e.getLength(); j++) {
            num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
          }
        }
        return new QRPolynomial(num, 0);
      }
      mod(e) {
        if (this.getLength() - e.getLength() < 0) return this;
        const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
        const num = this.num.slice();
        for (let i = 0; i < e.getLength(); i++) {
          num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
        }
        return new QRPolynomial(num, 0).mod(e);
      }
    }

    // كلاس بلوكات تصحيح الخطأ (RS blocks)
    class QRRSBlock {
      constructor(totalCount, dataCount) {
        this.totalCount = totalCount;
        this.dataCount = dataCount;
      }
      static RS_BLOCK_TABLE = [
        // [totalCount, dataCount] for type 4, level M
        [64, 48]
      ];
      static getRSBlocks(typeNumber, errorCorrectionLevel) {
        // هنا نستخدم فقط نوع 4 ومستوى تصحيح M
        const rsBlock = QRRSBlock.RS_BLOCK_TABLE[0];
        return [new QRRSBlock(rsBlock[0], rsBlock[1])];
      }
    }

    // الكلاس الرئيسي لكود QR
    class QRCode {
      constructor(typeNumber, errorCorrectionLevel) {
        this.typeNumber = typeNumber;
        this.errorCorrectionLevel = errorCorrectionLevel;
        this.modules = null;
        this.moduleCount = 0;
        this.dataCache = null;
        this.dataList = [];
      }

      addData(data) {
        const newData = new QR8bitByte(data);
        this.dataList.push(newData);
        this.dataCache = null;
      }

      getModuleCount() {
        return this.moduleCount;
      }

      make() {
        this.moduleCount = this.typeNumber * 4 + 17;
        this.modules = Array.from({ length: this.moduleCount }, () => Array(this.moduleCount).fill(null));

        this.setupPositionProbePattern(0, 0);
        this.setupPositionProbePattern(this.moduleCount - 7, 0);
        this.setupPositionProbePattern(0, this.moduleCount - 7);
        this.setupTimingPattern();

        this.dataCache = this.createData();
        this.mapData(this.dataCache);
      }

      setupPositionProbePattern(row, col) {
        for (let r = -1; r <= 7; r++) {
          if (row + r < 0 || row + r >= this.moduleCount) continue;
          for (let c = -1; c <= 7; c++) {
            if (col + c < 0 || col + c >= this.moduleCount) continue;
            if (
              (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
              (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
              (2 <= r && r <= 4 && 2 <= c && c <= 4)
            ) {
              this.modules[row + r][col + c] = true;
            } else {
              this.modules[row + r][col + c] = false;
            }
          }
        }
      }

      setupTimingPattern() {
        for (let i = 8; i < this.moduleCount - 8; i++) {
          if (this.modules[i][6] === null) this.modules[i][6] = i % 2 === 0;
          if (this.modules[6][i] === null) this.modules[6][i] = i % 2 === 0;
        }
      }

      createData() {
        const buffer = new QRBitBuffer();
        this.dataList.forEach(data => {
          buffer.put(4, 4); // 4 = 8bit byte mode
          buffer.put(data.getLength(), 8);
          data.write(buffer);
        });

        const rsBlocks = QRRSBlock.getRSBlocks(this.typeNumber, this.errorCorrectionLevel);
        let totalDataCount = 0;
        rsBlocks.forEach(rsBlock => {
          totalDataCount += rsBlock.dataCount;
        });

        // نهاية البيانات (terminator)
        if (buffer.length + 4 <= totalDataCount * 8) {
          buffer.put(0, 4);
        }

        // ملء البتات حتى تصل للطول المطلوب
        while (buffer.length % 8 !== 0) {
          buffer.putBit(false);
        }

        // ملء بيانات بايت مكرر 0xEC و 0x11 بالتناوب
        while (buffer.length / 8 < totalDataCount) {
          buffer.put(0xEC, 8);
          if (buffer.length / 8 >= totalDataCount) break;
          buffer.put(0x11, 8);
        }

        return this.createBytes(buffer, rsBlocks);
      }

      createBytes(buffer, rsBlocks) {
        let offset = 0;
        const dataBytes = [];
        rsBlocks.forEach(rsBlock => {
          const dc = rsBlock.dataCount;
          for (let i = 0; i < dc; i++) {
            dataBytes.push(buffer.buffer[i + offset]);
          }
          offset += dc;
        });

        // *** لا يوجد تصحيح خطأ (Reed-Solomon) في هذه النسخة المبسطة ***
        // لتطوير الكود، يمكن إضافة هنا شفرة تصحيح الخطأ.

        return dataBytes;
      }

      mapData(data) {
        let inc = -1;
        let row = this.moduleCount - 1;
        let bitIndex = 7;
        let byteIndex = 0;

for (let col = this.moduleCount - 1; col > 0; col -= 2) {
          if (col === 6) col--; // تخطّي عمود التوقيت

          while (true) {
            for (let c = 0; c < 2; c++) {
              if (this.modules[row][col - c] === null) {
                let dark = false;
                if (byteIndex < data.length) {
                  dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
                }
                this.modules[row][col - c] = dark;
                bitIndex--;
                if (bitIndex < 0) {
                  byteIndex++;
                  bitIndex = 7;
                }
              }
            }
            row += inc;
            if (row < 0 || row >= this.moduleCount) {
              row -= inc;
              inc = -inc;
              break;
            }
          }
        }
      }

      isDark(row, col) {
        if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
          throw new Error(row + "," + col);
        }
        return this.modules[row][col];
      }
    }

    // --- نهاية مكتبة QRCode المبسطة ---

    // وظيفة توليد كود QR وعرضه كصورة Canvas بدقة عالية
    function generateQR() {
      const text = document.getElementById('text').value.trim();
      if (!text) {
        alert('الرجاء إدخال نص لإنشاء كود QR.');
        return;
      }

      const qr = new QRCode(4, QRErrorCorrectionLevel.M);
      qr.addData(text);
      qr.make();

      const size = 330; // حجم الصورة النهائية 330x330 بكسل (33 modules * 10)
      const scale = size / qr.getModuleCount();

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // خلفية بيضاء
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, size, size);

      // رسم مربعات QR
      for (let row = 0; row < qr.getModuleCount(); row++) {
        for (let col = 0; col < qr.getModuleCount(); col++) {
          ctx.fillStyle = qr.isDark(row, col) ? '#000000' : '#ffffff';
          ctx.fillRect(col * scale, row * scale, scale, scale);
        }
      }

      const qrcodeDiv = document.getElementById('qrcode');
      qrcodeDiv.innerHTML = '';
      qrcodeDiv.appendChild(canvas);
      qrcodeDiv.classList.remove('hidden');

      document.getElementById('shareBtn').classList.remove('hidden');
      document.getElementById('instructions').classList.remove('hidden');
    }

    // وظيفة مشاركة كود QR كصورة (تستخدم Web Share API إن وجدت)
    async function shareQR() {
      const qrcodeDiv = document.getElementById('qrcode');
      if (!qrcodeDiv.firstChild) {
        alert('يرجى توليد كود QR أولاً.');
        return;
      }
      const canvas = qrcodeDiv.firstChild;
      canvas.toBlob(async (blob) => {
        if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'qrcode.png', { type: 'image/png' })] })) {
          try {
            await navigator.share({
              files: [new File([blob], 'qrcode.png', { type: 'image/png' })],
              title: 'كود QR',
              text: 'شارك معي كود QR هذا',
            });
          } catch (err) {
            alert('فشل المشاركة: ' + err);
          }
        } else {
          alert('المشاركة غير مدعومة في متصفحك.');
        }
      });
    }

    // حفظ صورة QR بالضغط المطول (للمستخدمين على الجوال)
    document.getElementById('qrcode').addEventListener('contextmenu', (e) => {
      e.preventDefault();
      alert('اضغط ضغطة طويلة على كود QR لحفظ الصورة.');
    });
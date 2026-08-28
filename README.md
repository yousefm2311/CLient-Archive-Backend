<div align="center">
  <img src="https://img.icons8.com/?size=100&id=46860&format=png&color=000000" alt="Archive Logo" width="120" />

  # 📦 Client Archiver Backend 

  **نظام خلفي (Backend) متكامل مبني بـ Express.js لرفع ملفات الـ PDF، ضغطها باستخدام Ghostscript، وحفظها كأرشيف ZIP مع حساب نسبة توفير مساحة التخزين.**

  [![Node.js](https://img.shields.io/badge/Node.js-%2343853D.svg?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![Express.js](https://img.shields.io/badge/Express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
  [![Ghostscript](https://img.shields.io/badge/Ghostscript-Ghost-lightgrey?style=for-the-badge)](#)
</div>

---

## 📖 نظرة عامة (Overview)

هذا المشروع عبارة عن واجهة برمجة تطبيقات (API) احترافية مصممة لاستقبال ملفات الـ PDF من العملاء، التأكد من صحتها وحمايتها، ومن ثم تقليل حجمها (Optimization) وتجميعها في ملف مضغوط (ZIP Archive). النظام يقوم أيضاً بتسجيل كافة بيانات العملية في قاعدة بيانات **MongoDB** لتحليل المساحة الموفرة (Storage Savings) بعد الضغط.

---

## ✨ المميزات الأساسية (Key Features)

*   **رفع متعدد للملفات (Multi-Upload):** دعم رفع عدد كبير من ملفات PDF في طلب واحد (حتى 30 ملف، بحجم 50MB للملف).
*   **ضغط الملفات المتقدم (PDF Optimization):** يستخدم أداة **Ghostscript** لتقليل جودة وحجم ملفات الـ PDF قبل أرشفتها لضمان أقل مساحة تخزين ممكنة.
*   **الأرشفة المباشرة (Stream Archiving):** يعتمد على `archiver` مع `Streams` لإنشاء ملفات הـ ZIP مباشرة على القرص الصلب دون استهلاك الذاكرة (RAM).
*   **حماية مسارات الملفات (Path Traversal Protection):** نظام حماية متقدم (`ensureWithinBase`) يمنع الوصول للملفات خارج المجلدات المخصصة.
*   **التحقق الأمني من الملفات (Strict Validation):** التحقق من الملفات عبر (MIME type، الامتداد، وقراءة توقيع الملف الثنائي `%PDF`).
*   **الحد من الطلبات (Rate Limiting):** حماية الـ API من هجمات الـ DDoS أو الـ Spam (بشكل افتراضي 200 طلب لكل 10 دقائق).
*   **حساب التوفير (Savings Calculation):** مقارنة حجم الملفات الأصلي مع حجم الأرشيف وتقديم تقارير دقيقة عن مساحة التخزين الموفرة.

---

## 🏗 التقنيات المستخدمة وهيكلة المشروع (Tech Stack & Architecture)

*   **بيئة التشغيل:** Node.js
*   **إطار العمل:** Express.js
*   **قاعدة البيانات:** MongoDB (عبر Mongoose)
*   **رفع الملفات:** Multer
*   **أدوات الضغط:** Ghostscript & Archiver
*   **الأمان:** Helmet & Cors & express-rate-limit
*   **التحقق من البيانات:** Zod

### 📁 هيكلة المجلدات (Directory Structure)

```text
Archive-Backend/
├── src/
│   ├── config/             # إعدادات قاعدة البيانات والتطبيقات
│   ├── controllers/        # المنطق البرمجي للـ Endpoints
│   ├── middlewares/        # الدوال الوسيطة (معالجة الأخطاء، الـ Rate limit)
│   ├── models/             # قوالب قاعدة البيانات (Mongoose Schemas)
│   ├── routes/             # مسارات واجهة برمجة التطبيقات (API Routes)
│   ├── services/           # الخدمات الأساسية (رفع الملفات، الأرشفة، قواعد البيانات)
│   ├── utils/              # دوال مساعدة إضافية
│   ├── app.js              # إعداد تطبيق الـ Express
│   └── server.js           # نقطة البداية وتشغيل الخادم
├── test/                   # ملفات الـ Unit Testing (Jest & Supertest)
└── uploads/                # المجلدات الافتراضية للملفات المؤقتة والأرشيفات (يتم إنشاؤها)
```

---

## 🚀 دليل التشغيل (Getting Started)

### المتطلبات الأساسية (Prerequisites)
1. **Node.js**: الإصدار 18 أو أحدث.
2. **MongoDB**: قاعدة بيانات تعمل محلياً أو على السحابة (Atlas).
3. **Ghostscript**: يجب تثبيته على نظام التشغيل لتفعيل ميزة ضغط الـ PDF. (يمكن تحميله للويندوز وإضافة مساره في المتغيرات).

### التثبيت (Installation)

1. **نسخ المشروع:**
   ```bash
   git clone <repository-url>
   cd Archive-Backend
   ```

2. **تثبيت الحزم (Dependencies):**
   ```bash
   npm install
   ```

3. **إعداد متغيرات البيئة (Environment Variables):**
   قم بإنشاء ملف `.env` (أو خذ نسخة من `.env.example`):
   ```bash
   cp .env.example .env
   ```
   **أهم المتغيرات التي يجب تعديلها:**
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/client_archiver
   UPLOAD_TEMP_DIR=D:\client-documents\temp
   UPLOAD_ARCHIVE_DIR=D:\client-documents\archives
   PDF_OPTIMIZE=true
   PDF_GS_PATH="C:\Program Files\gs\gs10.06.0\bin\gswin64c.exe" # مسار الـ Ghostscript بجهازك
   ```

4. **تشغيل الخادم:**
   ```bash
   # وضع التطوير (مع التحديث التلقائي)
   npm run dev

   # وضع الإنتاج
   npm start
   ```

---

## 🔗 مسارات الـ API الأساسية (Endpoints)

المسار الأساسي: `http://localhost:5000/api/archives`

| النوع | المسار | الوصف |
| :--- | :--- | :--- |
| `POST` | `/:clientId/upload` | رفع ملفات PDF للعميل (form-data: `files`) |
| `GET` | `/client/:clientId` | جلب قائمة الأرشيفات الخاصة بعميل معين |
| `GET` | `/:archiveId` | عرض معلومات أرشيف محدد بنسبة التوفير |
| `GET` | `/:archiveId/download` | تحميل ملف الـ ZIP مباشرة |
| `DELETE` | `/:archiveId` | حذف الأرشيف وملفه نهائياً |
| `GET` | `/health` | التأكد من عمل الخادم بكفاءة |

### 💡 أمثلة على الاستخدام (Curl Examples)

**رفع ملفات لأرشيف عميل (مثال العميل ACME):**
```bash
curl -X POST http://localhost:5000/api/archives/ACME/upload \
  -F "files=@/path/to/file1.pdf" \
  -F "files=@/path/to/file2.pdf"
```

**تحميل ملف مضغوط:**
```bash
curl -L -o ACME-archive.zip http://localhost:5000/api/archives/<archiveId>/download
```

---

## 🧪 الاختبارات (Testing)

المشروع يحتوي على اختبارات مدمجة باستخدام **Jest** و **Supertest**.
لتشغيل الاختبارات:
```bash
npm test
```
*يجب التأكد من تشغيل MongoDB قبل بدء الاختبارات، سيقوم البرنامج بإنشاء قاعدة بيانات مخصصة للاختبار.*

---

## 📄 الترخيص (License)
هذا المشروع متاح للاستخدام تحت ترخيص [MIT License](LICENSE).

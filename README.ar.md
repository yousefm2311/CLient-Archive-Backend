<div align="center">
  <img src="https://img.icons8.com/?size=100&id=46860&format=png&color=000000" alt="Archive Logo" width="120" />

  # 📦 Client Archiver Backend 

  **نظام خلفي (Backend) متكامل وقوي مبني بـ Express.js لرفع ملفات الـ PDF، ضغطها باحترافية (Ghostscript)، وأرشفتها (ZIP)، مع تحليل دقيق لتوفير مساحة التخزين.**

  [![Node.js](https://img.shields.io/badge/Node.js-%2343853D.svg?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![Express.js](https://img.shields.io/badge/Express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
  [![Ghostscript](https://img.shields.io/badge/Ghostscript-Ghost-lightgrey?style=for-the-badge)](#)

  [🇺🇸 View English Version](README.md)
</div>

---

## 📖 نظرة عامة (Overview)

هذا المشروع عبارة عن واجهة برمجة تطبيقات (API) مصممة خصيصاً للتعامل مع أحمال المستندات الثقيلة. يتيح النظام لتطبيقات العملاء رفع عدة ملفات PDF في وقت واحد. بمجرد استلام الملفات، يقوم النظام بالتحقق منها أمنياً، ثم يقوم بضغطها باستخدام تقنية **Ghostscript** (مما يقلل حجم الملف بشكل جذري مع الحفاظ على وضوح النص)، ويقوم بتجميعها داخل ملف مضغوط (ZIP) بدون استهلاك ذاكرة الخادم العشوائية (RAM).

أخيراً، يتم تخزين البيانات الوصفية (Metadata) في قاعدة بيانات **MongoDB** لحساب الفارق بين أحجام الملفات الأصلية وحجم الأرشيف النهائي لمعرفة المساحة الموفرة بدقة.

---

## ✨ المميزات الأساسية والتفاصيل التقنية

*   **رفع ضخم للملفات (Bulk Uploads):** يعالج ملفات الـ multipart بأمان تام، ويدعم حتى 30 ملف في الطلب الواحد بحد أقصى 50 ميجابايت للملف.
*   **ضغط ذكي للملفات (Intelligent Optimization):** يستخدم Ghostscript لعمل Downsample لملفات الـ PDF وتقليل جودتها بشكل مدروس. إذا فشل ضغط ملف معين لأي سبب، يتخطاه النظام بهدوء ويستخدم النسخة الأصلية لتجنب تعطل العملية.
*   **أرشفة فعالة للذاكرة (Memory-Efficient):** استخدام مكتبة `archiver` مع تقنية الـ Streams لكتابة ملف الـ ZIP مباشرة على القرص الصلب لتفادي استهلاك موارد الذاكرة.
*   **تتبع توفير المساحة:** يحسب تلقائياً الفرق بالبايت (Bytes) والنسبة المئوية بين إجمالي الملفات الأصلية وحجم ملف الـ ZIP الناتج.
*   **نظام حماية صارم (Security):**
    *   **تحقق من رأس الملف (Header Checks):** لا يكتفي بالامتداد بل يقرأ أول 4 بايت من الملف للتأكد من احتوائه على بصمة `%PDF` الحقيقية.
    *   **منع اختراق المسارات (Path Traversal Prevention):** أداة `ensureWithinBase` مصممة خصيصاً لسجن جميع العمليات داخل المجلدات المصرح بها فقط.
    *   **تقييد الطلبات (Rate Limiting):** حماية الـ Endpoints من هجمات الحرمان من الخدمة (DDoS) بحد 200 طلب كل 10 دقائق.
*   **تنظيف آلي (Automated Cleanup):** مسح كامل للمجلدات المؤقتة التي تحتوي على الملفات المرفوعة بعد إتمام أو فشل عملية الأرشفة.

---

## 🏗 دورة حياة الطلب وهيكلة النظام (Workflow)

### ماذا يحدث عندما يرفع العميل ملفات؟
1. **استقبال الطلب:** يقوم العميل بالنداء على مسار `POST /:clientId/upload` مع إرفاق الملفات.
2. **مرشحات الحماية:** يمر الطلب على الـ Rate Limiter ثم يتم التأكد من صحة المتغيرات عبر مكتبة `zod`. يتم تخصيص رقم تعريفي فريد للطلب `requestId`.
3. **الكتابة المؤقتة:** تقوم أداة `multer` بتخزين الملفات بشكل مؤقت في مسار معزول `uploads/temp/<clientId>/<requestId>/`.
4. **مرحلة الضغط:** إذا كانت الخاصية `PDF_OPTIMIZE=true`، يقوم الخادم بفتح عدة عمليات (Child Processes) لبرنامج Ghostscript لضغط كل ملف على حدة.
5. **مرحلة الأرشفة:** يفتح الخادم مسار كتابة مباشر للملف النهائي `uploads/archives/<clientId>/`. يتم تمرير الملفات المضغوطة إليه وتجميعها في ملف ZIP بضغط مستوى 9.
6. **التخزين في قواعد البيانات:** تُحفظ تفاصيل العملية في MongoDB لمعرفة حجم المساحة الموفرة.
7. **التنظيف:** يتم حذف المجلد المؤقت بشكل آلي.

### 📁 الهيكلة الشجرية (Directory Structure)
```text
Archive-Backend/
├── src/
│   ├── config/             # إعدادات قاعدة البيانات
│   ├── controllers/        # المنطق البرمجي للـ Endpoints
│   ├── middlewares/        # الدوال الوسيطة (معالجة الأخطاء، الـ Rate limit)
│   ├── models/             # قوالب قاعدة البيانات (Mongoose Schemas)
│   ├── routes/             # مسارات واجهة برمجة التطبيقات (API Routes)
│   ├── services/           # الخدمات الأساسية (Ghostscript, Multer, Zipping)
│   ├── utils/              # دوال مساعدة إضافية
│   ├── app.js              # إعداد تطبيق الـ Express
│   └── server.js           # نقطة البداية وتشغيل الخادم
├── test/                   # ملفات الـ Unit Testing (Jest & Supertest)
└── uploads/                # المجلدات الافتراضية للملفات المؤقتة والأرشيفات (يتم إنشاؤها)
```

---

## ⚙️ متغيرات البيئة (Environment Variables)

قم بنسخ ملف `.env.example` إلى `.env` وعدّله حسب حاجتك.

| المتغير | الوصف | القيمة الافتراضية |
| :--- | :--- | :--- |
| `PORT` | المنفذ الذي يعمل عليه الخادم | `5000` |
| `MONGO_URI` | رابط الاتصال بقاعدة البيانات | `mongodb://127.0.0.1:27017/client_archiver` |
| `UPLOAD_TEMP_DIR` | المسار الخاص بالملفات المؤقتة | `D:\client-documents\temp` |
| `UPLOAD_ARCHIVE_DIR` | المسار الدائم لتخزين ملفات الـ ZIP | `D:\client-documents\archives` |
| `MAX_FILES` | أقصى عدد ملفات في الطلب الواحد | `30` |
| `MAX_FILE_SIZE_MB` | أقصى حجم مسموح للملف الواحد | `50` |
| `PDF_OPTIMIZE` | تفعيل تقنية ضغط الملفات | `true` |
| `PDF_HEADER_CHECK` | تفعيل التحقق الأمني من توقيع `%PDF` | `true` |
| `PDF_GS_PATH` | مسار برنامج Ghostscript | `gs` |
| `PDF_GS_PRESET` | قوة إعدادات الضغط (`screen`, `ebook`, `printer`) | `screen` |

---

## 🚀 التشغيل والإعداد

### المتطلبات الأساسية
*   **Node.js**: إصدار 18 فما فوق.
*   **MongoDB**: قاعدة بيانات (محلية أو Atlas).
*   **Ghostscript**: يجب تثبيته وإضافته في مسار النظام (OS Path).

### خطوات التثبيت

1. **نسخ المشروع وتثبيت الحزم:**
   ```bash
   git clone <repository-url>
   cd Archive-Backend
   npm install
   ```

2. **تشغيل الخادم:**
   ```bash
   # وضع التطوير
   npm run dev

   # وضع الإنتاج
   npm start
   ```

---

## 🔗 مسارات الـ API (API Reference)

المسار الأساسي: `http://localhost:5000/api/archives`

### `POST /:clientId/upload`
رفع الملفات وصناعة الأرشيف. يقبل `multipart/form-data`.
*   **المدخلات**: `files` (عدة ملفات PDF).
*   **المخرجات**: تعيد معرّف الأرشيف `archiveId`، رابط التحميل، وإحصائيات توفير المساحة.

### `GET /client/:clientId`
جلب قائمة بكل أرشيفات عميل معين. يتم ترتيبها من الأحدث للأقدم.

### `GET /:archiveId`
جلب بيانات وتفاصيل أرشيف معين بالكامل.

### `GET /:archiveId/download`
يبدأ بث (Stream) ملف الـ ZIP مباشرة للمستخدم للتحميل.

### `DELETE /:archiveId`
مسح الأرشيف وملف الـ ZIP نهائياً من القرص الصلب وكذلك مسح السجل الخاص به من قواعد البيانات.

### `GET /health`
للتأكد من صحة وعمل الخادم.

---

## 🧪 الاختبارات (Testing)

يمكنك تشغيل الاختبارات الأوتوماتيكية باستخدام أمر:
```bash
npm test
```
*ملاحظة: سيتم إجراء الاختبارات على قاعدة بيانات منفصلة للـ Test لضمان عدم تأثر بياناتك.*

---

## 📄 الترخيص
هذا المشروع مرخص بموجب [MIT License](LICENSE).

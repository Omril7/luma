import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Colors ────────────────────────────────────────────────────────────────────

  const [oak, walnut, white, anthracite] = await Promise.all([
    prisma.colorOption.upsert({
      where: { id: 'color-oak' },
      update: {},
      create: {
        id: 'color-oak',
        name_he: 'אלון טבעי',
        name_en: 'Natural Oak',
        hexCode: '#C8A96E',
        isActive: true,
      },
    }),
    prisma.colorOption.upsert({
      where: { id: 'color-walnut' },
      update: {},
      create: {
        id: 'color-walnut',
        name_he: 'אגוז',
        name_en: 'Walnut',
        hexCode: '#5C3D2E',
        isActive: true,
      },
    }),
    prisma.colorOption.upsert({
      where: { id: 'color-white' },
      update: {},
      create: {
        id: 'color-white',
        name_he: 'לבן',
        name_en: 'White',
        hexCode: '#F5F5F0',
        isActive: true,
      },
    }),
    prisma.colorOption.upsert({
      where: { id: 'color-anthracite' },
      update: {},
      create: {
        id: 'color-anthracite',
        name_he: 'אנתרציט',
        name_en: 'Anthracite',
        hexCode: '#3C3C3C',
        isActive: true,
      },
    }),
  ])

  console.log('✓ Colors')

  // ── Categories ────────────────────────────────────────────────────────────────

  const categoryData: { id: string; name_he: string; name_en: string; sortOrder: number }[] = [
    { id: 'cat-table', name_he: 'שולחנות', name_en: 'Tables', sortOrder: 0 },
    { id: 'cat-shelf', name_he: 'מדפים', name_en: 'Shelves', sortOrder: 1 },
    { id: 'cat-console', name_he: 'קונסולות', name_en: 'Consoles', sortOrder: 2 },
    { id: 'cat-shoe-rack', name_he: 'מתלי נעליים', name_en: 'Shoe Racks', sortOrder: 3 },
    { id: 'cat-nightstand', name_he: 'שידות לילה', name_en: 'Nightstands', sortOrder: 4 },
    { id: 'cat-armchair', name_he: 'כורסאות', name_en: 'Armchairs', sortOrder: 5 },
    { id: 'cat-tv-stand', name_he: 'מזנונים לטלוויזיה', name_en: 'TV Stands', sortOrder: 6 },
    { id: 'cat-bench', name_he: 'ספסלים', name_en: 'Benches', sortOrder: 7 },
    { id: 'cat-other', name_he: 'אחר', name_en: 'Other', sortOrder: 8 },
  ]

  await Promise.all(
    categoryData.map((c) =>
      prisma.category.upsert({
        where: { id: c.id },
        update: {},
        create: { ...c, isActive: true },
      })
    )
  )

  console.log('✓ Categories')

  // ── Product 1: Dining Table (customizable) ────────────────────────────────────

  const table = await prisma.product.upsert({
    where: { slug: 'oak-dining-table' },
    update: {},
    create: {
      id: 'prod-table',
      slug: 'oak-dining-table',
      name_he: 'שולחן אוכל עץ אלון',
      name_en: 'Oak Dining Table',
      description_he:
        'שולחן אוכל עשוי עץ אלון מלא, מיוצר בעבודת יד בישראל. ניתן להתאמה אישית לכל מידה לפי הזמנה. גימור שמן טבעי לאורך חיים.',
      description_en:
        'Solid oak dining table, handcrafted in Israel. Available in custom dimensions to order. Finished with natural oil for lasting beauty.',
      categoryId: 'cat-table',
      basePrice: 2800,
      customizable: true,
      isActive: true,
      isFeatured: true,
      sortOrder: 1,
      colorOptions: { connect: [{ id: oak.id }, { id: walnut.id }, { id: white.id }] },
      images: {
        create: [
          {
            url: 'https://placehold.co/800x600/C8A96E/white?text=Oak+Table',
            altText_he: 'שולחן אוכל עץ אלון - תמונה ראשית',
            altText_en: 'Oak dining table - main image',
            sortOrder: 0,
            isPrimary: true,
          },
          {
            url: 'https://placehold.co/800x600/B89A5E/white?text=Oak+Table+2',
            altText_he: 'שולחן אוכל עץ אלון - פרטי עץ',
            altText_en: 'Oak dining table - wood detail',
            sortOrder: 1,
            isPrimary: false,
          },
          {
            url: 'https://placehold.co/800x600/A88A4E/white?text=Oak+Table+3',
            altText_he: 'שולחן אוכל עץ אלון - זווית צד',
            altText_en: 'Oak dining table - side angle',
            sortOrder: 2,
            isPrimary: false,
          },
        ],
      },
      variants: {
        create: [
          {
            id: 'var-table-s',
            name_he: 'S – 80×160 ס"מ',
            name_en: 'S – 80×160 cm',
            width: 80,
            depth: 160,
            height: 75,
            price: 2800,
            sku: 'TABLE-OAK-S',
            isActive: true,
          },
          {
            id: 'var-table-m',
            name_he: 'M – 90×200 ס"מ',
            name_en: 'M – 90×200 cm',
            width: 90,
            depth: 200,
            height: 75,
            price: 3500,
            sku: 'TABLE-OAK-M',
            isActive: true,
          },
          {
            id: 'var-table-l',
            name_he: 'L – 100×240 ס"מ',
            name_en: 'L – 100×240 cm',
            width: 100,
            depth: 240,
            height: 75,
            price: 4500,
            sku: 'TABLE-OAK-L',
            isActive: true,
          },
        ],
      },
      customPricingRule: {
        create: {
          basedOnVariantId: 'var-table-s',
          pricePerCmWidth: 30, // ₪0.30/cm = 30 agorot
          pricePerCmDepth: 15, // ₪0.15/cm = 15 agorot
          minWidth: 60,
          maxWidth: 120,
          minDepth: 120,
          maxDepth: 300,
        },
      },
    },
  })

  // ── Product 2: Wall Shelf (customizable) ──────────────────────────────────────

  const shelf = await prisma.product.upsert({
    where: { slug: 'floating-wall-shelf' },
    update: {},
    create: {
      id: 'prod-shelf',
      slug: 'floating-wall-shelf',
      name_he: 'מדף קיר צף',
      name_en: 'Floating Wall Shelf',
      description_he:
        'מדף קיר צף עשוי עץ מלא, מתאים לסלון, חדר שינה או משרד. זמין בכל אורך לפי הזמנה. הרכבה פשוטה עם חומרה מוסתרת.',
      description_en:
        'Solid wood floating wall shelf, perfect for living room, bedroom or office. Available in any length to order. Easy installation with hidden hardware.',
      categoryId: 'cat-shelf',
      basePrice: 350,
      customizable: true,
      isActive: true,
      isFeatured: true,
      sortOrder: 2,
      colorOptions: {
        connect: [{ id: oak.id }, { id: walnut.id }, { id: white.id }, { id: anthracite.id }],
      },
      images: {
        create: [
          {
            url: 'https://placehold.co/800x600/C8A96E/white?text=Wall+Shelf',
            altText_he: 'מדף קיר צף - תמונה ראשית',
            altText_en: 'Floating wall shelf - main image',
            sortOrder: 0,
            isPrimary: true,
          },
          {
            url: 'https://placehold.co/800x600/B89A5E/white?text=Shelf+Detail',
            altText_he: 'מדף קיר - פרטי עץ',
            altText_en: 'Wall shelf - wood detail',
            sortOrder: 1,
            isPrimary: false,
          },
        ],
      },
      variants: {
        create: [
          {
            id: 'var-shelf-s',
            name_he: 'S – 60 ס"מ',
            name_en: 'S – 60 cm',
            width: 60,
            depth: 20,
            height: 3,
            price: 350,
            sku: 'SHELF-S',
            isActive: true,
          },
          {
            id: 'var-shelf-m',
            name_he: 'M – 90 ס"מ',
            name_en: 'M – 90 cm',
            width: 90,
            depth: 20,
            height: 3,
            price: 480,
            sku: 'SHELF-M',
            isActive: true,
          },
          {
            id: 'var-shelf-l',
            name_he: 'L – 120 ס"מ',
            name_en: 'L – 120 cm',
            width: 120,
            depth: 25,
            height: 3,
            price: 620,
            sku: 'SHELF-L',
            isActive: true,
          },
        ],
      },
      customPricingRule: {
        create: {
          basedOnVariantId: 'var-shelf-s',
          pricePerCmWidth: 6, // ₪0.06/cm = 6 agorot
          pricePerCmDepth: 4, // ₪0.04/cm = 4 agorot
          minWidth: 30,
          maxWidth: 200,
          minDepth: 15,
          maxDepth: 40,
        },
      },
    },
  })

  // ── Product 3: Nightstand (standard, not customizable) ────────────────────────

  const nightstand = await prisma.product.upsert({
    where: { slug: 'solid-wood-nightstand' },
    update: {},
    create: {
      id: 'prod-nightstand',
      slug: 'solid-wood-nightstand',
      name_he: 'שידת לילה עץ מלא',
      name_en: 'Solid Wood Nightstand',
      description_he:
        'שידת לילה מעץ מלא עם מגירה אחת, שתיים או שלוש. עיצוב נקי ומינימליסטי המתאים לכל חדר שינה. זמינה בשלל גוונים.',
      description_en:
        'Solid wood nightstand with one, two or three drawers. Clean minimalist design suited for any bedroom. Available in a range of finishes.',
      categoryId: 'cat-nightstand',
      basePrice: 890,
      customizable: false,
      isActive: true,
      isFeatured: false,
      sortOrder: 3,
      colorOptions: { connect: [{ id: oak.id }, { id: walnut.id }, { id: white.id }] },
      images: {
        create: [
          {
            url: 'https://placehold.co/800x600/C8A96E/white?text=Nightstand',
            altText_he: 'שידת לילה עץ מלא - תמונה ראשית',
            altText_en: 'Solid wood nightstand - main image',
            sortOrder: 0,
            isPrimary: true,
          },
          {
            url: 'https://placehold.co/800x600/B89A5E/white?text=Nightstand+Open',
            altText_he: 'שידת לילה - מגירות פתוחות',
            altText_en: 'Nightstand - drawers open',
            sortOrder: 1,
            isPrimary: false,
          },
        ],
      },
      variants: {
        create: [
          {
            id: 'var-ns-s',
            name_he: 'S – מגירה אחת',
            name_en: 'S – 1 Drawer',
            width: 45,
            depth: 40,
            height: 55,
            price: 890,
            sku: 'NS-1D',
            isActive: true,
          },
          {
            id: 'var-ns-m',
            name_he: 'M – שתי מגירות',
            name_en: 'M – 2 Drawers',
            width: 45,
            depth: 40,
            height: 65,
            price: 1100,
            sku: 'NS-2D',
            isActive: true,
          },
          {
            id: 'var-ns-l',
            name_he: 'L – שלוש מגירות',
            name_en: 'L – 3 Drawers',
            width: 45,
            depth: 40,
            height: 80,
            price: 1350,
            sku: 'NS-3D',
            isActive: true,
          },
        ],
      },
    },
  })

  // ── Product 4: TV Console (customizable) ──────────────────────────────────────

  const tvConsole = await prisma.product.upsert({
    where: { slug: 'tv-console' },
    update: {},
    create: {
      id: 'prod-console',
      slug: 'tv-console',
      name_he: 'מזנון טלוויזיה',
      name_en: 'TV Console',
      description_he:
        'מזנון טלוויזיה מעץ מלא עם תאים פתוחים ומגירות. ניתן לכל רוחב לפי הזמנה. עיצוב סקנדינבי עם גימור ישראלי.',
      description_en:
        'Solid wood TV console with open compartments and drawers. Available in custom widths to order. Scandinavian design with an Israeli touch.',
      categoryId: 'cat-tv-stand',
      basePrice: 1800,
      customizable: true,
      isActive: true,
      isFeatured: true,
      sortOrder: 4,
      colorOptions: { connect: [{ id: oak.id }, { id: walnut.id }, { id: anthracite.id }] },
      images: {
        create: [
          {
            url: 'https://placehold.co/800x600/C8A96E/white?text=TV+Console',
            altText_he: 'מזנון טלוויזיה - תמונה ראשית',
            altText_en: 'TV console - main image',
            sortOrder: 0,
            isPrimary: true,
          },
          {
            url: 'https://placehold.co/800x600/B89A5E/white?text=Console+Detail',
            altText_he: 'מזנון טלוויזיה - פרטי עץ',
            altText_en: 'TV console - wood detail',
            sortOrder: 1,
            isPrimary: false,
          },
          {
            url: 'https://placehold.co/800x600/A88A4E/white?text=Console+Open',
            altText_he: 'מזנון טלוויזיה - תאים פתוחים',
            altText_en: 'TV console - open compartments',
            sortOrder: 2,
            isPrimary: false,
          },
        ],
      },
      variants: {
        create: [
          {
            id: 'var-tv-s',
            name_he: 'S – 120 ס"מ',
            name_en: 'S – 120 cm',
            width: 120,
            depth: 40,
            height: 50,
            price: 1800,
            sku: 'TV-S',
            isActive: true,
          },
          {
            id: 'var-tv-m',
            name_he: 'M – 150 ס"מ',
            name_en: 'M – 150 cm',
            width: 150,
            depth: 40,
            height: 50,
            price: 2200,
            sku: 'TV-M',
            isActive: true,
          },
          {
            id: 'var-tv-l',
            name_he: 'L – 180 ס"מ',
            name_en: 'L – 180 cm',
            width: 180,
            depth: 45,
            height: 50,
            price: 2700,
            sku: 'TV-L',
            isActive: true,
          },
        ],
      },
      customPricingRule: {
        create: {
          basedOnVariantId: 'var-tv-s',
          pricePerCmWidth: 20, // ₪0.20/cm = 20 agorot
          pricePerCmDepth: 10, // ₪0.10/cm = 10 agorot
          minWidth: 100,
          maxWidth: 250,
          minDepth: 30,
          maxDepth: 60,
        },
      },
    },
  })

  console.log('✓ Products:', table.slug, shelf.slug, nightstand.slug, tvConsole.slug)

  // ── Coupons ───────────────────────────────────────────────────────────────────

  await Promise.all([
    // Permanent 10% welcome code
    prisma.coupon.upsert({
      where: { code: 'WELCOME10' },
      update: {},
      create: {
        code: 'WELCOME10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        isActive: true,
        singleUsePerCustomer: false,
        firstOrderOnly: false,
        autoApply: false,
      },
    }),
    // First order only — ₪50 off
    prisma.coupon.upsert({
      where: { code: 'FIRST50' },
      update: {},
      create: {
        code: 'FIRST50',
        discountType: 'FIXED_AMOUNT',
        discountValue: 50,
        minOrderAmount: 500,
        isActive: true,
        firstOrderOnly: true,
        singleUsePerCustomer: false,
        autoApply: false,
      },
    }),
    // Deadline code — 25% off, expires end of 2026
    prisma.coupon.upsert({
      where: { code: 'SUMMER25' },
      update: {},
      create: {
        code: 'SUMMER25',
        discountType: 'PERCENTAGE',
        discountValue: 25,
        validFrom: new Date('2026-06-01'),
        validUntil: new Date('2026-09-30T23:59:59'),
        isActive: true,
        singleUsePerCustomer: false,
        firstOrderOnly: false,
        autoApply: false,
      },
    }),
    // One-time global — ₪100 off (single use)
    prisma.coupon.upsert({
      where: { code: 'ONCE100' },
      update: {},
      create: {
        code: 'ONCE100',
        discountType: 'FIXED_AMOUNT',
        discountValue: 100,
        maxUses: 1,
        minOrderAmount: 800,
        isActive: true,
        singleUsePerCustomer: false,
        firstOrderOnly: false,
        autoApply: false,
      },
    }),
    // Per-customer once — 15% loyalty
    prisma.coupon.upsert({
      where: { code: 'LOYAL15' },
      update: {},
      create: {
        code: 'LOYAL15',
        discountType: 'PERCENTAGE',
        discountValue: 15,
        isActive: true,
        singleUsePerCustomer: true,
        firstOrderOnly: false,
        autoApply: false,
      },
    }),
    // Auto-apply 5% — always on
    prisma.coupon.upsert({
      where: { code: 'AUTO5' },
      update: {},
      create: {
        code: 'AUTO5',
        discountType: 'PERCENTAGE',
        discountValue: 5,
        isActive: true,
        autoApply: true,
        singleUsePerCustomer: false,
        firstOrderOnly: false,
      },
    }),
  ])

  console.log('✓ Coupons')

  // ── Newsletter subscribers ────────────────────────────────────────────────────

  await Promise.all([
    prisma.newsletterSubscriber.upsert({
      where: { email: 'yael@example.com' },
      update: {},
      create: { email: 'yael@example.com', name: 'יעל כהן', language: 'he', isActive: true },
    }),
    prisma.newsletterSubscriber.upsert({
      where: { email: 'moshe@example.com' },
      update: {},
      create: { email: 'moshe@example.com', name: 'משה לוי', language: 'he', isActive: true },
    }),
    prisma.newsletterSubscriber.upsert({
      where: { email: 'dana@example.com' },
      update: {},
      create: { email: 'dana@example.com', name: 'דנה אברהם', language: 'he', isActive: true },
    }),
    prisma.newsletterSubscriber.upsert({
      where: { email: 'sarah@example.com' },
      update: {},
      create: { email: 'sarah@example.com', name: 'Sarah Green', language: 'en', isActive: true },
    }),
    prisma.newsletterSubscriber.upsert({
      where: { email: 'david@example.com' },
      update: {},
      create: { email: 'david@example.com', name: 'David Miller', language: 'en', isActive: true },
    }),
  ])

  console.log('✓ Newsletter subscribers')

  // ── Admin user ────────────────────────────────────────────────────────────────

  const passwordHash = await hash('LumaAdmin2026!', 12)
  await prisma.adminUser.upsert({
    where: { email: 'admin@luma.co.il' },
    update: {},
    create: {
      email: 'admin@luma.co.il',
      passwordHash,
    },
  })

  console.log('✓ Admin user (admin@luma.co.il / LumaAdmin2026!)')

  // ── Email settings ─────────────────────────────────────────────────────────────

  const existingEmailSettings = await prisma.emailSettings.findFirst()
  if (!existingEmailSettings) {
    await prisma.emailSettings.create({
      data: {
        fromAddress: 'noreply@luma.co.il',
        fromName_he: 'לומה רהיטים',
        fromName_en: 'Luma Furniture',
        replyTo: 'hello@luma.co.il',
      },
    })
  }

  console.log('✓ Email settings')

  // ── Site content ──────────────────────────────────────────────────────────────

  const siteContentBlobs = [
    {
      key: 'home.hero',
      value: {
        title_he: 'רהיטים עשויים ביד, בשבילך',
        title_en: 'Handcrafted furniture, made for you',
        subtitle_he: 'כל פריט מיוצר בישראל מעץ מלא, בדיוק לפי המידות שלך',
        subtitle_en: 'Every piece handmade in Israel from solid wood, exactly to your dimensions',
        cta_he: 'גלה את הקולקציה',
        cta_en: 'Explore the collection',
        imageUrl: 'https://placehold.co/1600x900/C8A96E/white?text=Luma+Furniture',
      },
    },
    {
      key: 'home.story',
      value: {
        title_he: 'הסיפור שלנו',
        title_en: 'Our Story',
        body_he:
          'לומה נולדה מתוך אהבה לעץ ולמלאכה. כל פריט שאנו יוצרים הוא שילוב של עיצוב מודרני ומסורת אומנותית עתיקה. אנו מאמינים שרהיטים טובים הם השקעה לכל החיים.',
        body_en:
          'Luma was born from a love of wood and craft. Every piece we create blends modern design with ancient artisanal tradition. We believe great furniture is a lifelong investment.',
        imageUrl: 'https://placehold.co/800x600/5C3D2E/white?text=Our+Workshop',
      },
    },
    {
      key: 'about.page',
      value: {
        title_he: 'אודות לומה',
        title_en: 'About Luma',
        body_he:
          'לומה היא סטודיו לרהיטים עשויים ביד, ממוקם בישראל. אנו מתמחים ברהיטי עץ מלא מותאמים אישית לכל לקוח. הסדנה שלנו פעילה משנת 2018, ומאז ייצרנו מאות פריטים ייחודיים לבתים ברחבי הארץ.',
        body_en:
          'Luma is a handcrafted furniture studio based in Israel. We specialize in solid wood furniture custom-made for each client. Our workshop has been active since 2018, and since then we have crafted hundreds of unique pieces for homes across the country.',
        imageUrl: 'https://placehold.co/1200x800/C8A96E/white?text=About+Luma',
      },
    },
    {
      key: 'contact.info',
      value: {
        phone: '050-123-4567',
        whatsapp: '972501234567',
        email: 'hello@luma.co.il',
        address_he: 'רחוב האומן 12, תל אביב',
        address_en: '12 Haoman St, Tel Aviv',
        hours_he: 'ראשון–חמישי 09:00–18:00 | שישי 09:00–14:00',
        hours_en: 'Sun–Thu 09:00–18:00 | Fri 09:00–14:00',
      },
    },
    {
      key: 'faq.items',
      value: {
        items: [
          {
            q_he: 'כמה זמן לוקחת הייצור?',
            q_en: 'How long does production take?',
            a_he: 'זמן הייצור הוא 4–6 שבועות מרגע אישור ההזמנה ותשלום מקדמה.',
            a_en: 'Production time is 4–6 weeks from order confirmation and deposit payment.',
          },
          {
            q_he: 'האם ניתן לבקר בסדנה?',
            q_en: 'Can I visit the workshop?',
            a_he: 'כן! ניתן לתאם ביקור בסדנה בתיאום מראש. נשמח לראות אתכם.',
            a_en: 'Yes! You can arrange a workshop visit by appointment. We would love to see you.',
          },
          {
            q_he: 'מה כלול במחיר?',
            q_en: 'What is included in the price?',
            a_he: 'המחיר כולל ייצור, גימור ואחריות שנה. משלוח מחושב בנפרד לפי אזור.',
            a_en: 'The price includes production, finishing and a one-year warranty. Shipping is calculated separately by region.',
          },
          {
            q_he: 'באילו סוגי עץ אתם משתמשים?',
            q_en: 'What types of wood do you use?',
            a_he: 'אנו עובדים בעיקר עם אלון, אגוז ואשור מיובשים בתנור. כל חומר גלם עובר בדיקת איכות קפדנית.',
            a_en: 'We primarily work with kiln-dried oak, walnut and ash. All raw materials undergo strict quality checks.',
          },
          {
            q_he: 'האם יש אחריות?',
            q_en: 'Is there a warranty?',
            a_he: 'כן, כל הרהיטים שלנו מגיעים עם אחריות של שנה על פגמי ייצור.',
            a_en: 'Yes, all our furniture comes with a one-year warranty against manufacturing defects.',
          },
        ],
      },
    },
    {
      key: 'gallery.intro',
      value: {
        title_he: 'הגלריה שלנו',
        title_en: 'Our Gallery',
        subtitle_he: 'עבודות שיצאו מהסדנה שלנו לבתים ברחבי ישראל',
        subtitle_en: 'Work that left our workshop and found homes across Israel',
      },
    },
  ]

  for (const blob of siteContentBlobs) {
    await prisma.siteContent.upsert({
      where: { key: blob.key },
      update: { value: blob.value },
      create: { key: blob.key, value: blob.value },
    })
  }

  console.log('✓ Site content')

  console.log('\n✅ Seed complete.')
  console.log('   Admin login: admin@luma.co.il / LumaAdmin2026!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

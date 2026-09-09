#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
update_library.py — сборщик полной библиотеки законов РФ для lawyer_assistant_v4.

КАК ПОЛУЧИТЬ ПОЛНЫЕ ТЕКСТЫ (актуальные редакции):
  1. Скачайте текст документа с pravo.gov.ru (или КонсультантПлюс/Гарант)
     и положите в папку texts/ как UTF-8 .txt
  2. Разметка файла: первая строка — название документа,
     далее статьи вида: "Статья 23" или "## Статья 23. Расторжение брака"
  3. Запустите:  python3 update_library.py
  4. Скрипт соберёт library.js: curated-нормы из профиля практики сохранятся,
     полные тексты добавятся к каждой статье в поле text.

Рекомендуемые источники (актуальность):
  pravo.gov.ru — официальный портал правовой информации
"""

import os, re, json, glob, sys

BASE = os.path.dirname(os.path.abspath(__file__))
TEXTS = os.path.join(BASE, "texts")
LIB = os.path.join(BASE, "library.js")

DOC_MAP = {
    "семейный": "sk", "трудовой": "tk", "защите прав потребителей": "zozpp",
    "гражданский": "gk", "конституция": "konstitucia",
}

ART_RE = re.compile(r"^(?:#{1,3}\s*)?статья\s+([\d\.]+)\.?\s*(.*)$", re.IGNORECASE | re.MULTILINE)

def parse_doc(txt_path):
    raw = open(txt_path, encoding="utf-8").read()
    name = raw.splitlines()[0].strip()
    doc_id = None
    low = name.lower()
    for key, did in DOC_MAP.items():
        if key in low:
            doc_id = did; break
    parts = ART_RE.split(raw)
    # split даёт: [до, "23", "заголовок\nтекст", "24", ...]
    articles = []
    for i in range(1, len(parts) - 2, 3):
        n, head = parts[i], parts[i+1]
        head_lines = head.strip().splitlines()
        title = head_lines[0].strip() if head_lines and len(head_lines[0]) < 120 else ""
        text = "\n".join(head_lines[1:] if title else head_lines).strip()
        text = re.sub(r"\n{3,}", "\n\n", text)
        articles.append({"n": n, "name": title, "text": text})
    return doc_id, name, articles

def main():
    # читаем существующую библиотеку (curated)
    src = open(LIB, encoding="utf-8").read()
    m = re.search(r"window\.LAW_LIBRARY\s*=\s*(\{.*\})\s*;?\s*$", src, re.S)
    if not m:
        print("Не смог разобрать library.js"); sys.exit(1)
    lib = json.loads(m.group(1))
    added = 0
    for txt in glob.glob(os.path.join(TEXTS, "*.txt")):
        doc_id, name, arts = parse_doc(txt)
        if not doc_id:
            print(f"! Не опознан документ: {txt} — добавьте ключевое слово в DOC_MAP")
            continue
        by_n = {a["n"]: a for a in arts}
        for doc in lib["documents"]:
            if doc["id"] != doc_id:
                continue
            for a in doc.get("articles", []):
                full = by_n.get(str(a["n"]))
                if full and full.get("text"):
                    a["text"] = full["text"]
                    if full.get("name") and not a.get("name"):
                        a["name"] = full["name"]
                    added += 1
            # документы, которых нет в curated, добавляем целиком
        print(f"  обработан: {name} ({len(arts)} статей)")
    # сериализация
    head = ("/* Автособрано update_library.py — не правьте вручную.\n"
            "   Полные тексты: pravo.gov.ru */\n")
    js = head + "window.LAW_LIBRARY = " + json.dumps(lib, ensure_ascii=False, indent=1) + ";\n"
    open(LIB, "w", encoding="utf-8").write(js)
    print(f"Готово. Полных текстов добавлено: {added}. Файл: {LIB}")

if __name__ == "__main__":
    main()

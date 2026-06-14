const WEBHOOK_URL = "";
const FALLBACK_EMAIL = "info@example.com";

const form = document.querySelector("#leadForm");
const statusNode = document.querySelector("#formStatus");

function getPayload(formElement) {
  const formData = new FormData(formElement);
  return {
    name: formData.get("name")?.trim(),
    contact: formData.get("contact")?.trim(),
    eventType: formData.get("eventType"),
    dateCity: formData.get("dateCity")?.trim(),
    message: formData.get("message")?.trim(),
    source: formData.get("source"),
    page: window.location.href,
    createdAt: new Date().toISOString()
  };
}

function saveLead(payload) {
  const key = "production-leads";
  const previous = JSON.parse(localStorage.getItem(key) || "[]");
  previous.push(payload);
  localStorage.setItem(key, JSON.stringify(previous));
}

function openEmail(payload) {
  const subject = encodeURIComponent("Заявка на съемку / трансляцию");
  const body = encodeURIComponent(
    `Имя: ${payload.name}\n` +
    `Контакт: ${payload.contact}\n` +
    `Формат: ${payload.eventType}\n` +
    `Дата и город: ${payload.dateCity || "-"}\n\n` +
    `Задача:\n${payload.message || "-"}`
  );

  window.location.href = `mailto:${FALLBACK_EMAIL}?subject=${subject}&body=${body}`;
}

async function sendLead(payload) {
  if (!WEBHOOK_URL) {
    saveLead(payload);
    openEmail(payload);
    return "Заявка сохранена в браузере. Открылось письмо для отправки.";
  }

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Webhook request failed");
  }

  return "Заявка отправлена. Мы скоро свяжемся.";
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = getPayload(form);
  statusNode.textContent = "Отправляем...";

  try {
    const message = await sendLead(payload);
    statusNode.textContent = message;
    form.reset();
  } catch (error) {
    saveLead(payload);
    statusNode.textContent = "Не получилось отправить в CRM. Заявка сохранена локально.";
  }
});

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { contactSchema, SERVICES, type ContactInput } from "../lib/contactSchema";

export default function ContactForm() {
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", service: "", message: "" },
  });

  const onSubmit = async (data: ContactInput) => {
    clearErrors("root");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    } catch {
      // Setting a root error keeps isSubmitSuccessful false so the form stays visible.
      setError("root", {
        message:
          "Something went wrong sending your message. Please email jchornales.dev@gmail.com directly.",
      });
      // Re-throw so react-hook-form marks the submission as failed.
      throw new Error("submit failed");
    }
  };

  if (isSubmitSuccessful) {
    return (
      <div className="form-success show" role="status">
        <div className="form-success-icon" aria-hidden="true">
          ✓
        </div>
        <h3>Message sent!</h3>
        <p>Thanks for reaching out. I'll get back to you within 24 hours.</p>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="cf-name">Name</label>
          <input
            id="cf-name"
            type="text"
            placeholder="Your name"
            aria-invalid={errors.name ? "true" : "false"}
            {...register("name")}
          />
          {errors.name && <span className="form-error">{errors.name.message}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="cf-email">Email</label>
          <input
            id="cf-email"
            type="email"
            placeholder="your@email.com"
            aria-invalid={errors.email ? "true" : "false"}
            {...register("email")}
          />
          {errors.email && <span className="form-error">{errors.email.message}</span>}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="cf-service">I need help with</label>
        <select id="cf-service" {...register("service")}>
          <option value="">Select a service…</option>
          {SERVICES.map((service) => (
            <option key={service} value={service}>
              {service}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="cf-message">Message</label>
        <textarea
          id="cf-message"
          placeholder="Tell me about your project…"
          rows={5}
          aria-invalid={errors.message ? "true" : "false"}
          {...register("message")}
        />
        {errors.message && <span className="form-error">{errors.message.message}</span>}
      </div>

      {errors.root && (
        <p className="form-submit-error" role="alert">
          {errors.root.message}
        </p>
      )}

      <button type="submit" className="form-submit" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send It →"}
      </button>
    </form>
  );
}

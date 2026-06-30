export type ProjectVideo = {
  type: "file" | "embed";
  src: string;
};

export type Project = {
  cat: string;
  title: string;
  desc: string;
  image?: string;
  video?: ProjectVideo;
  link?: string;
  delay: number;
};

export const projects: Project[] = [
  {
    cat: "Web Development",
    title: "Rake Engineering Consultancy Website",
    desc: "Production website for a civil engineering consultancy — built for speed, credibility, and lead generation.",
    image: "/uploads/rake-homepage.png",
    link: "https://rake-engineering.com/",
    delay: 1,
  },
  {
    cat: "Automation",
    title: "CRM → Slack Pipeline",
    desc: "n8n automation connecting CRM, email, and Slack — recovering 10+ hours of manual work per week.",
    delay: 2,
  },
  {
    cat: "AI Chatbot",
    title: "Facebook Lead Bot",
    desc: "Messenger chatbot that qualifies leads, answers FAQs, and books calls automatically — without a human in the loop.",
    image: "/uploads/facebook-lead-capture-thumbnail.png",
    video: { type: "file", src: "/uploads/facebook-lead-video.mp4" },
    delay: 1,
  },
  {
    cat: "Reservation & Scheduling",
    title: "Custom Booking System",
    desc: "Reservation system with real-time calendar sync and automated reminders — replacing a manual booking process entirely.",
    delay: 2,
  },
];

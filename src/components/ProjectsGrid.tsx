import { useEffect, useRef, useState } from "react";
import type { Project } from "../constants/projects";

type Props = {
  projects: Project[];
};

export default function ProjectsGrid({ projects }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const isOpen = activeIndex !== null;
  const active = isOpen ? projects[activeIndex] : null;

  const close = () => setActiveIndex(null);

  // Escape to close + body scroll lock while open
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Move focus into the dialog on open, return it to the card on close
  const lastIndexRef = useRef<number | null>(null);
  useEffect(() => {
    if (isOpen) {
      lastIndexRef.current = activeIndex;
      closeRef.current?.focus();
    } else if (lastIndexRef.current !== null) {
      cardRefs.current[lastIndexRef.current]?.focus();
      lastIndexRef.current = null;
    }
  }, [isOpen, activeIndex]);

  return (
    <>
      <div className="projects-grid">
        {projects.map((project, i) => {
          const hasMedia = Boolean(project.video || project.image);
          const inner = (
            <>
              <div className="project-thumb">
                {project.image ? (
                  <img
                    className="project-thumb-img"
                    src={project.image}
                    alt={`${project.title} — screenshot`}
                    width="800"
                    height="500"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="project-thumb-label">{project.cat}</span>
                )}
              </div>
              <div className="project-meta">
                <div>
                  <div className="project-cat">{project.cat}</div>
                  <div className="project-title">{project.title}</div>
                  <div className="project-desc">{project.desc}</div>
                </div>
                {hasMedia && <span className="project-arrow">↗</span>}
              </div>
            </>
          );

          if (!hasMedia) {
            return (
              <div
                key={project.title}
                className={`project-item project-item--static reveal reveal-delay-${project.delay}`}
              >
                {inner}
              </div>
            );
          }

          return (
            <button
              type="button"
              key={project.title}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className={`project-item reveal reveal-delay-${project.delay}`}
              onClick={() => setActiveIndex(i)}
              aria-haspopup="dialog"
            >
              {inner}
            </button>
          );
        })}
      </div>

      {isOpen && active && (
        <div
          className="project-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className="project-modal"
            role="dialog"
            aria-modal="true"
            aria-label={active.title}
          >
            <button
              type="button"
              ref={closeRef}
              className="project-modal-close"
              onClick={close}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="project-modal-media">
              <ProjectMedia project={active} />
              {active.link && (
                <a
                  className="project-modal-link"
                  href={active.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visit site <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProjectMedia({ project }: { project: Project }) {
  // Media priority: video → image → category placeholder
  if (project.video) {
    if (project.video.type === "file") {
      return (
        <video
          className="project-modal-video"
          src={project.video.src}
          controls
          muted
          playsInline
        />
      );
    }
    return (
      <iframe
        className="project-modal-iframe"
        src={project.video.src}
        title={`${project.title} — video`}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (project.image) {
    return (
      <img
        className="project-modal-img"
        src={project.image}
        alt={`${project.title} — screenshot`}
        decoding="async"
      />
    );
  }

  return <span className="project-thumb-label">{project.cat}</span>;
}

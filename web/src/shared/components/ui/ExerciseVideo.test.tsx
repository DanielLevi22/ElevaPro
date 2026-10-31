import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExerciseVideo } from "./ExerciseVideo";

describe("demonstração do exercício", () => {
  it("reproduz MP4 mudo em loop com capa e controles", () => {
    render(<ExerciseVideo videoUrl="https://ik.imagekit.io/test/exercises/squat/v1.mp4" />);
    const video = screen.getByLabelText("Demonstração do exercício") as HTMLVideoElement;
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.autoplay).toBe(true);
    expect(video.controls).toBe(true);
    expect(video.poster).toBe("https://ik.imagekit.io/test/exercises/squat/v1.jpg");
  });

  it("sem vídeo ou com endereço inválido não ocupa espaço", () => {
    const { container, rerender } = render(<ExerciseVideo />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ExerciseVideo videoUrl="javascript:alert(1)" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("preserva links de YouTube do especialista", () => {
    render(<ExerciseVideo videoUrl="https://youtu.be/abcdefghijk" name="Remada" />);
    expect(screen.getByTitle("Demonstração de Remada")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/abcdefghijk",
    );
  });

  it("falha de mídia permite abrir outro exercício", () => {
    const { rerender } = render(<ExerciseVideo videoUrl="https://cdn.example/squat.mp4" />);
    fireEvent.error(screen.getByLabelText("Demonstração do exercício"));
    expect(screen.getByRole("status")).toHaveTextContent("Demonstração indisponível");
    rerender(<ExerciseVideo videoUrl="https://cdn.example/row.mp4" />);
    expect(screen.getByLabelText("Demonstração do exercício")).toHaveAttribute(
      "src",
      "https://cdn.example/row.mp4",
    );
  });
});

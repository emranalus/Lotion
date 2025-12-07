export type Task = {
  id: string;
  title: string;
  column: "Not Started" | "In Progress" | "Done";
};

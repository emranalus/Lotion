export type Task = {
  id: string;
  title: string;
  column: "Not Started" | "In Progress" | "Done";
  imageUrl?: string;
  order: number;
};

export type Notification = {
  id: string;
  message: string;
  type: "error" | "success" | "info";
};

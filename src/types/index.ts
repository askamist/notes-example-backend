export interface User {
  id: string;
  emailAddresses: Array<{ emailAddress: string }>;
}

export interface AuthContext {
  userId: string;
  user?: User;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  members: TeamMember[];
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  email: string;
  role: "owner" | "member";
  createdAt: Date;
  updatedAt: Date;
}

export type TeamCreateInput = {
  name: string;
  ownerId: string;
  ownerEmail: string;
};

export type TeamMemberCreateInput = {
  teamId: string;
  email: string;
  userId?: string;
  role?: "owner" | "member";
};

export interface Role {
  id:    number
  code:  string   // "admin" | "user"
  label: string
}

export interface Status {
  id:    number
  code:  string
  label: string
  color: string | null
  _count?: { tasks: number }
}

export interface Privilege {
  id:    number
  code:  string
  label: string
  color: string | null
  _count?: { tasks: number }
}

export interface User {
  id:            string     // cuid — better-auth utilise des strings
  name:          string
  email:         string
  emailVerified: boolean
  image:         string | null
  roleId:        number | null
  role?: {
    id: number
    code: string
    label: string
  }
  createdAt:     string | Date
  updatedAt:     string | Date
}

export interface Task {
  id:          number
  title:       string
  description: string | null
  dueDate:     string | Date | null
  createdAt:   string | Date
  updatedAt:   string | Date

  statusId:    number
  privilegeId: number
  status?:     Status
  privilege?:  Privilege

  assignedTo:  string | null   // string (cuid)
  createdBy:   string          // string (cuid)
  assignee?:   { id: string; name: string } | null
  creator?:    { id: string; name: string } | null
}

// Session retournée par /api/auth/me
export interface AuthSession {
  user: {
    id:    string
    name:  string
    email: string
    role:  Role | null
  }
}
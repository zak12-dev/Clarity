import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

// Better-auth hash le mot de passe avec scrypt — ici on simule un hash bcrypt
// pour le seed uniquement. En prod, c'est better-auth qui gère le hashage.
function hashPassword(pwd: string) {
  return createHash('sha256').update(pwd).digest('hex')
}

async function main() {

  // ── Rôles ────────────────────────────────────────────
  const roleAdmin = await prisma.role.upsert({
    where:  { code: 'admin' },
    update: {},
    create: { code: 'admin', label: 'Administrateur' }
  })
  const roleUser = await prisma.role.upsert({
    where:  { code: 'user' },
    update: {},
    create: { code: 'user', label: 'Utilisateur' }
  })
  console.log('✅ Rôles créés:', [roleAdmin.label, roleUser.label])

  // ── Status ───────────────────────────────────────────
  const [sTodo, sProgress, sDone] = await Promise.all([
    prisma.status.upsert({ where: { code:'todo' },       update:{}, create:{ code:'todo',       label:'À faire',  color:'#e5e7eb' } }),
    prisma.status.upsert({ where: { code:'inprogress' }, update:{}, create:{ code:'inprogress', label:'En cours', color:'#dbeafe' } }),
    prisma.status.upsert({ where: { code:'done' },       update:{}, create:{ code:'done',       label:'Terminé',  color:'#d1fae5' } }),
  ])
  console.log('✅ Status créés')

  // ── Privileges ───────────────────────────────────────
  const [pLow, pMed, pHigh] = await Promise.all([
    prisma.privilege.upsert({ where: { code:'low' },    update:{}, create:{ code:'low',    label:'Basse',   color:'#dcfce7' } }),
    prisma.privilege.upsert({ where: { code:'medium' }, update:{}, create:{ code:'medium', label:'Moyenne', color:'#fef9c3' } }),
    prisma.privilege.upsert({ where: { code:'high' },   update:{}, create:{ code:'high',   label:'Haute',   color:'#fee2e2' } }),
  ])
  console.log('✅ Privileges créés')

  // ── Users (format better-auth) ───────────────────────
  // ⚠️ Ces utilisateurs sont pour le seed/dev uniquement.
  // En prod, les utilisateurs s'inscrivent via better-auth qui gère le hash.
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@app.com' },
    update: {},
    create: {
      email:         'admin@app.com',
      name:          'Administrateur',
      emailVerified: true,
      roleId:        roleAdmin.id,
      accounts: {
        create: {
          accountId:  'admin@app.com',
          providerId: 'credential',
          password:   hashPassword('admin123'),
        }
      }
    }
  })

  const user = await prisma.user.upsert({
    where:  { email: 'user@app.com' },
    update: {},
    create: {
      email:         'user@app.com',
      name:          'Utilisateur',
      emailVerified: true,
      roleId:        roleUser.id,
      accounts: {
        create: {
          accountId:  'user@app.com',
          providerId: 'credential',
          password:   hashPassword('user123'),
        }
      }
    }
  })
  console.log('✅ Users créés:', [admin.name, user.name])

  // ── Tâches de démo ───────────────────────────────────
  const now = new Date()
  const day = (n: number) => new Date(now.getFullYear(), now.getMonth(), n, 9, 0)

  await prisma.task.createMany({
    skipDuplicates: true,
    data: [
      { title:'Réunion équipe',      description:'Réunion hebdomadaire', statusId:sTodo.id,     privilegeId:pHigh.id, dueDate:day(3),  assignedTo:user.id,  createdBy:admin.id },
      { title:'Rapport mensuel',     description:'Préparer le rapport',  statusId:sProgress.id, privilegeId:pMed.id,  dueDate:day(7),  assignedTo:user.id,  createdBy:admin.id },
      { title:'Mise à jour serveur', description:'MAJ dépendances',      statusId:sTodo.id,     privilegeId:pLow.id,  dueDate:day(10), assignedTo:admin.id, createdBy:admin.id },
      { title:'Design maquette',     description:'Maquettes Figma',      statusId:sDone.id,     privilegeId:pMed.id,  dueDate:day(14), assignedTo:user.id,  createdBy:user.id  },
      { title:'Déploiement prod',    description:'Déployer version 2.1', statusId:sTodo.id,     privilegeId:pHigh.id, dueDate:day(20), assignedTo:admin.id, createdBy:admin.id },
    ]
  })
  console.log('✅ Tâches de démo créées')
}

main().catch(console.error).finally(() => prisma.$disconnect())
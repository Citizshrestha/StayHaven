# Database Backup & Recovery

> Backup strategies, disaster recovery, and data protection for StayHaven MongoDB

---

## 📋 Table of Contents

1. [Backup Strategies](#backup-strategies)
2. [Backup Tools](#backup-tools)
3. [Restore Procedures](#restore-procedures)
4. [Disaster Recovery](#disaster-recovery)
5. [Best Practices](#best-practices)

---

## 💾 Backup Strategies

### Backup Types

#### 1. Full Backup

```bash
# Complete database backup
mongodump --uri="mongodb://localhost:27017/stayhaven" \
  --out=/backup/full/2026-02-02

# Result:
# /backup/full/2026-02-02/
#   ├── users.bson
#   ├── users.metadata.json
#   ├── hotels.bson
#   ├── hotels.metadata.json
#   ├── bookings.bson
#   ├── bookings.metadata.json
#   └── ... (all collections)

# Backup size: ~500 MB
# Time: ~2 minutes
```

#### 2. Incremental Backup

```bash
# Backup only changes since last backup
mongodump --uri="mongodb://localhost:27017/stayhaven" \
  --query='{"updatedAt": {"$gte": ISODate("2026-02-02T00:00:00Z")}}' \
  --out=/backup/incremental/2026-02-02

# Pros: Faster, smaller
# Cons: Requires full backup + all incrementals to restore
```

#### 3. Collection-Specific Backup

```bash
# Backup specific collection
mongodump --uri="mongodb://localhost:27017/stayhaven" \
  --collection=users \
  --out=/backup/users/2026-02-02

# Use case: Critical collections (users, bookings, orders)
```

#### 4. Compressed Backup

```bash
# Backup with gzip compression
mongodump --uri="mongodb://localhost:27017/stayhaven" \
  --gzip \
  --out=/backup/compressed/2026-02-02

# Reduces size by ~70%
# Original: 500 MB → Compressed: 150 MB
```

---

## 🛠️ Backup Tools

### 1. mongodump (Command Line)

#### Basic Usage

```bash
# Local MongoDB
mongodump --host=localhost --port=27017 \
  --db=stayhaven \
  --out=/backup/2026-02-02

# MongoDB Atlas (cloud)
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/stayhaven" \
  --out=/backup/atlas/2026-02-02
```

#### Advanced Options

```bash
# Full backup with all options
mongodump \
  --uri="mongodb://localhost:27017/stayhaven" \
  --out=/backup/full/$(date +%Y-%m-%d) \
  --gzip \
  --oplog \
  --numParallelCollections=4 \
  --readPreference=secondary

# Options explained:
# --gzip: Compress output
# --oplog: Capture oplog for point-in-time backup
# --numParallelCollections: Parallel backup (faster)
# --readPreference=secondary: Use replica secondary (reduce primary load)
```

#### Exclude Collections

```bash
# Exclude temporary/cache collections
mongodump --uri="mongodb://localhost:27017/stayhaven" \
  --excludeCollection=sessions \
  --excludeCollection=cache \
  --out=/backup/2026-02-02
```

### 2. Automated Backup Script

```bash
#!/bin/bash
# backup-mongodb.sh

# Configuration
DB_URI="mongodb://localhost:27017/stayhaven"
BACKUP_DIR="/backup/mongodb"
RETENTION_DAYS=30

# Create backup directory with timestamp
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_PATH="$BACKUP_DIR/$DATE"

# Perform backup
echo "Starting backup: $DATE"
mongodump --uri="$DB_URI" \
  --gzip \
  --out="$BACKUP_PATH"

# Check if backup succeeded
if [ $? -eq 0 ]; then
  echo "Backup completed successfully: $BACKUP_PATH"
  
  # Delete backups older than retention period
  find "$BACKUP_DIR" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \;
  echo "Old backups cleaned up (retention: $RETENTION_DAYS days)"
else
  echo "Backup failed!"
  exit 1
fi
```

#### Schedule with Cron

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup-mongodb.sh >> /var/log/mongodb-backup.log 2>&1

# Weekly full backup on Sunday
0 3 * * 0 /path/to/backup-mongodb-full.sh

# Hourly incremental backup (business hours)
0 9-18 * * 1-5 /path/to/backup-mongodb-incremental.sh
```

### 3. Node.js Backup Script

```javascript
// backup.js
const { exec } = require('child_process');
const path = require('path');

const backupMongoDB = () => {
  const date = new Date().toISOString().split('T')[0];
  const backupPath = path.join('/backup/mongodb', date);
  
  const command = `mongodump --uri="${process.env.MONGODB_URI}" --gzip --out="${backupPath}"`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Backup failed:', error);
      return;
    }
    
    console.log('Backup completed:', backupPath);
    console.log(stdout);
  });
};

// Run backup
backupMongoDB();
```

#### Schedule with node-cron

```javascript
// server.js
const cron = require('node-cron');
const { backupMongoDB } = require('./utils/backup');

// Daily backup at 2 AM
cron.schedule('0 2 * * *', () => {
  console.log('Starting scheduled backup');
  backupMongoDB();
});

// Weekly full backup on Sunday at 3 AM
cron.schedule('0 3 * * 0', () => {
  console.log('Starting weekly full backup');
  backupMongoDB({ full: true });
});
```

### 4. MongoDB Atlas Automated Backups

```javascript
// MongoDB Atlas features:
// ✅ Automatic daily snapshots
// ✅ Continuous cloud backup
// ✅ Point-in-time recovery
// ✅ Cross-region backup replication
// ✅ Snapshot retention (7 days free, configurable)

// No manual setup required - enabled by default
// Access via Atlas dashboard: Backup → Snapshots
```

---

## ♻️ Restore Procedures

### 1. Full Database Restore

```bash
# Restore entire database
mongorestore --uri="mongodb://localhost:27017" \
  --gzip \
  --drop \
  /backup/2026-02-02/stayhaven

# Options:
# --drop: Drop existing collections before restore
# --gzip: Decompress gzip backup
```

### 2. Specific Collection Restore

```bash
# Restore single collection
mongorestore --uri="mongodb://localhost:27017/stayhaven" \
  --collection=users \
  --gzip \
  --drop \
  /backup/2026-02-02/stayhaven/users.bson.gz

# Use case: Restore accidentally deleted collection
```

### 3. Partial Data Restore

```bash
# Restore with query filter
mongorestore --uri="mongodb://localhost:27017/stayhaven" \
  --nsInclude="stayhaven.users" \
  --nsInclude="stayhaven.bookings" \
  --drop \
  /backup/2026-02-02/stayhaven

# Only restores users and bookings collections
```

### 4. Restore to Different Database

```bash
# Restore to new database (testing/staging)
mongorestore --uri="mongodb://localhost:27017" \
  --nsFrom="stayhaven.*" \
  --nsTo="stayhaven_test.*" \
  /backup/2026-02-02/stayhaven

# Result: Restores to stayhaven_test database
```

### 5. Point-in-Time Recovery

```bash
# Restore database to specific timestamp
# Step 1: Restore full backup
mongorestore --uri="mongodb://localhost:27017" \
  --oplogReplay \
  /backup/2026-02-02/stayhaven

# Step 2: Apply oplog up to specific time
mongorestore --uri="mongodb://localhost:27017" \
  --oplogReplay \
  --oplogLimit=1675339200:1 \
  /backup/2026-02-02/oplog.bson

# Use case: Restore to state before data corruption
```

---

## 🚨 Disaster Recovery

### Disaster Scenarios

#### 1. Data Corruption

```bash
# Symptom: Database corrupted, server crashes

# Recovery Steps:
# 1. Stop MongoDB server
sudo systemctl stop mongod

# 2. Restore from last backup
mongorestore --uri="mongodb://localhost:27017" \
  --drop \
  /backup/latest/stayhaven

# 3. Verify data integrity
mongo stayhaven --eval "db.stats()"

# 4. Restart MongoDB
sudo systemctl start mongod
```

#### 2. Accidental Data Deletion

```bash
# Symptom: Critical collection deleted

# Recovery Steps:
# 1. Identify backup timestamp (before deletion)
# 2. Restore specific collection
mongorestore --uri="mongodb://localhost:27017/stayhaven" \
  --collection=users \
  --drop \
  /backup/2026-02-01/stayhaven/users.bson

# 3. Verify restoration
mongo stayhaven --eval "db.users.count()"
```

#### 3. Server Hardware Failure

```bash
# Symptom: Server crash, data lost

# Recovery Steps:
# 1. Set up new server
# 2. Install MongoDB
# 3. Restore from remote backup (S3/Azure)
aws s3 sync s3://stayhaven-backups/latest /tmp/backup
mongorestore --uri="mongodb://new-server:27017" /tmp/backup

# 4. Update application connection string
# 5. Test application
```

#### 4. Ransomware Attack

```bash
# Symptom: Database encrypted by ransomware

# Recovery Steps:
# 1. Isolate infected server
# 2. Provision new clean server
# 3. Restore from offline backup (not connected to network)
mongorestore --uri="mongodb://new-server:27017" \
  /offline-backup/2026-02-01/stayhaven

# 4. Update security (passwords, firewall)
# 5. Deploy application to new server
```

### Recovery Time Objective (RTO)

```javascript
// Target recovery times for StayHaven

const RECOVERY_OBJECTIVES = {
  criticalData: {
    rto: '1 hour', // Max downtime
    rpo: '15 minutes' // Max data loss
  },
  standardData: {
    rto: '4 hours',
    rpo: '1 hour'
  },
  archivalData: {
    rto: '24 hours',
    rpo: '24 hours'
  }
};
```

---

## 🔐 Backup Security

### Encryption

```bash
# Encrypt backup with GPG
mongodump --uri="mongodb://localhost:27017/stayhaven" \
  --archive | gpg --encrypt --recipient admin@stayhaven.com \
  > /backup/stayhaven-$(date +%Y-%m-%d).archive.gpg

# Decrypt backup
gpg --decrypt /backup/stayhaven-2026-02-02.archive.gpg \
  | mongorestore --archive
```

### Access Control

```bash
# Restrict backup directory permissions
chmod 700 /backup/mongodb
chown mongodb:mongodb /backup/mongodb

# Only MongoDB user can access
```

### Remote Backup Storage

```bash
# Upload to AWS S3
aws s3 sync /backup/mongodb s3://stayhaven-backups/ \
  --storage-class GLACIER \
  --exclude "*.tmp"

# Upload to Azure Blob Storage
az storage blob upload-batch \
  --source /backup/mongodb \
  --destination stayhaven-backups \
  --account-name stayhavenstorage
```

---

## ✅ Best Practices

### 1. 3-2-1 Backup Rule

```
3 copies of data:
  - Production database
  - Local backup
  - Remote backup

2 different media types:
  - Local disk
  - Cloud storage

1 offsite backup:
  - Different geographic location
```

### 2. Backup Schedule

```javascript
// Recommended backup frequency

const BACKUP_SCHEDULE = {
  full: 'Daily at 2 AM',
  incremental: 'Every 6 hours',
  critical: 'Hourly (users, bookings, orders)',
  
  retention: {
    daily: '30 days',
    weekly: '12 weeks',
    monthly: '12 months',
    yearly: '7 years' // Compliance
  }
};
```

### 3. Test Restores Regularly

```bash
# Monthly restore test
mongorestore --uri="mongodb://test-server:27017" \
  --drop \
  /backup/latest/stayhaven

# Verify data integrity
mongo test-server:27017/stayhaven --eval "
  db.users.count();
  db.bookings.count();
  db.orders.count();
"
```

### 4. Monitor Backup Success

```javascript
// backup-monitor.js
const fs = require('fs');
const path = require('path');

const checkBackupSuccess = () => {
  const today = new Date().toISOString().split('T')[0];
  const backupPath = path.join('/backup/mongodb', today);
  
  if (!fs.existsSync(backupPath)) {
    console.error('⚠️ Backup missing for today!');
    sendAlert('Backup failed or missing');
    return false;
  }
  
  // Check backup size (should be > 100 MB)
  const stats = fs.statSync(backupPath);
  const sizeInMB = stats.size / (1024 * 1024);
  
  if (sizeInMB < 100) {
    console.error('⚠️ Backup size too small!');
    sendAlert(`Backup size only ${sizeInMB.toFixed(2)} MB`);
    return false;
  }
  
  console.log('✅ Backup verification passed');
  return true;
};

// Run daily check
const cron = require('node-cron');
cron.schedule('0 3 * * *', checkBackupSuccess); // 3 AM daily
```

### 5. Document Recovery Procedures

```javascript
// disaster-recovery-plan.md

## Recovery Procedures

### Scenario 1: Database Corruption
1. Stop MongoDB: `sudo systemctl stop mongod`
2. Restore backup: `mongorestore --drop /backup/latest`
3. Start MongoDB: `sudo systemctl start mongod`
4. Verify: `mongo stayhaven --eval "db.stats()"`

### Scenario 2: Accidental Deletion
1. Identify backup timestamp
2. Restore collection: `mongorestore --collection=users /backup/timestamp`
3. Verify: `db.users.count()`

### Emergency Contacts
- Database Admin: +1-555-0101
- DevOps Team: devops@stayhaven.com
- MongoDB Support: support@mongodb.com
```

---

## 📊 Backup Checklist

| Task | Frequency | Status |
|---|---|---|
| **Full backup** | Daily | ✅ |
| **Incremental backup** | Every 6 hours | ✅ |
| **Remote backup sync** | Daily | ✅ |
| **Test restore** | Monthly | ✅ |
| **Verify backup integrity** | Daily | ✅ |
| **Update recovery docs** | Quarterly | ✅ |
| **Security audit** | Quarterly | ✅ |
| **Disaster recovery drill** | Annually | ✅ |

---

## 📚 Related Documents

- [Database Overview](./database-overview.md)
- [Transaction & Consistency](./transaction-and-consistency.md)
- [Soft Delete & Auditing](./soft-delete-and-auditing.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive backup and recovery guide

---

## 🎯 Quick Reference

### Backup Commands

```bash
# Full backup
mongodump --uri="mongodb://localhost:27017/stayhaven" --out=/backup/$(date +%Y-%m-%d)

# Compressed backup
mongodump --uri="mongodb://localhost:27017/stayhaven" --gzip --out=/backup/$(date +%Y-%m-%d)

# Collection backup
mongodump --uri="mongodb://localhost:27017/stayhaven" --collection=users --out=/backup/users
```

### Restore Commands

```bash
# Full restore
mongorestore --uri="mongodb://localhost:27017" --drop /backup/2026-02-02/stayhaven

# Collection restore
mongorestore --uri="mongodb://localhost:27017/stayhaven" --collection=users --drop /backup/users.bson

# Restore to different DB
mongorestore --uri="mongodb://localhost:27017" --nsFrom="stayhaven.*" --nsTo="stayhaven_test.*" /backup/stayhaven
```

-- Fix debts table by adding missing columns
-- Run this SQL script directly in your PostgreSQL database

-- Add original_amount column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'debts' AND column_name = 'original_amount') THEN
        ALTER TABLE debts ADD COLUMN original_amount FLOAT;
        RAISE NOTICE 'Added original_amount column to debts table';
    ELSE
        RAISE NOTICE 'original_amount column already exists in debts table';
    END IF;
END $$;

-- Add paid_amount column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'debts' AND column_name = 'paid_amount') THEN
        ALTER TABLE debts ADD COLUMN paid_amount FLOAT DEFAULT 0.0;
        RAISE NOTICE 'Added paid_amount column to debts table';
    ELSE
        RAISE NOTICE 'paid_amount column already exists in debts table';
    END IF;
END $$;

-- Migrate existing debts data
UPDATE debts 
SET original_amount = amount,
    paid_amount = CASE 
        WHEN is_paid = true THEN amount 
        ELSE 0.0 
    END
WHERE original_amount IS NULL;

-- Verify the changes
SELECT 
    COUNT(*) as total_debts,
    COUNT(CASE WHEN original_amount IS NOT NULL THEN 1 END) as debts_with_original_amount,
    COUNT(CASE WHEN paid_amount IS NOT NULL THEN 1 END) as debts_with_paid_amount
FROM debts;

-- Show sample data
SELECT 
    id, 
    amount, 
    original_amount, 
    paid_amount, 
    is_paid,
    description
FROM debts 
LIMIT 5; 
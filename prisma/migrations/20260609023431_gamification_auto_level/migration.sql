-- Calculate level from XP using same binary-search algorithm as frontend/backend
CREATE OR REPLACE FUNCTION calculate_level(xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
  low INTEGER := 1;
  high INTEGER := 1000;
  mid INTEGER;
  total INTEGER;
  i INTEGER;
BEGIN
  WHILE low < high LOOP
    mid := (low + high + 1) / 2;
    total := 0;
    i := 1;
    WHILE i < mid LOOP
      total := total + GREATEST(FLOOR(50 * i + 80 * LN(i + 1::DOUBLE PRECISION) + 5 * i * i)::INTEGER, 1);
      i := i + 1;
    END LOOP;
    IF total <= xp THEN
      low := mid;
    ELSE
      high := mid - 1;
    END IF;
  END LOOP;
  RETURN low;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function to auto-sync level from xp
CREATE OR REPLACE FUNCTION sync_gamification_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level := calculate_level(NEW.xp);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger on insert or xp update
DROP TRIGGER IF EXISTS trg_sync_gamification_level ON "Gamifications";
CREATE TRIGGER trg_sync_gamification_level
  BEFORE INSERT OR UPDATE OF xp ON "Gamifications"
  FOR EACH ROW
  EXECUTE FUNCTION sync_gamification_level();

-- Fix any existing stale levels
UPDATE "Gamifications" SET level = calculate_level(xp) WHERE level != calculate_level(xp);

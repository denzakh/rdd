-- Авто-генерация дельты D1 из diff реестра и снапшота.
-- Не редактировать вручную: правьте реестр и запустите "npm run gen:d1".

ALTER TABLE phases ADD COLUMN "depression_severity" INTEGER NULL;

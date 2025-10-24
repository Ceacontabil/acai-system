-- REMOVE A FUNÇÃO DE ESTOQUE ANTIGA (BASEADA NO MODELO products)
DROP FUNCTION IF EXISTS update_stock_after_sale() CASCADE;

-- REMOVE O GATILHO DE ESTOQUE ANTIGO (BASEADO NO MODELO products)
DROP TRIGGER IF EXISTS update_stock_trigger ON sales;

-- REMOVE A FUNÇÃO ANTIGA DE POTE ÚNICO (update_pote_after_sale)
DROP FUNCTION IF EXISTS update_pote_after_sale() CASCADE;

-- REMOVE O GATILHO ANTIGO DE POTE ÚNICO
DROP TRIGGER IF EXISTS update_pote_trigger ON sales;

-- REMOVE QUALQUER VERSÃO DA SUA NOVA FUNÇÃO (para garantir limpeza total)
DROP FUNCTION IF EXISTS consume_pote_ml() CASCADE;

-- REMOVE A POLÍTICA RLS PROBLEMÁTICA
DROP POLICY IF EXISTS "Allow public insert on sales" ON "public"."sales";


-- A. RECRIAR A FUNÇÃO DE DEDUÇÃO DE ML (COMPATÍVEL COM POTE_IDS)
CREATE OR REPLACE FUNCTION consume_pote_ml()
RETURNS TRIGGER AS $$
DECLARE
    pote_id_atual UUID;
    ml_por_pote_consumido NUMERIC;
    num_potes INT;
    ml_restante INT;
BEGIN
    num_potes := array_length(NEW.pote_ids, 1);
    
    IF num_potes IS NULL OR num_potes = 0 THEN
        RETURN NEW;
    END IF;

    ml_por_pote_consumido := NEW.ml_consumed / num_potes; 

    FOREACH pote_id_atual IN ARRAY NEW.pote_ids
    LOOP
        -- Subtrai o ML
        UPDATE potes
        SET remaining_ml = remaining_ml - ml_por_pote_consumido
        WHERE id = pote_id_atual
        RETURNING remaining_ml INTO ml_restante;

        -- Marca como esgotado se o ML restante for 0 ou negativo
        IF ml_restante <= 0 THEN
             UPDATE potes
             SET status = 'esgotado'
             WHERE id = pote_id_atual;
        END IF;

    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 


-- B. RECRIAR O GATILHO
CREATE TRIGGER sales_consume_pote_trigger
BEFORE INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION consume_pote_ml();

-- C. RECRIAR A POLÍTICA RLS
CREATE POLICY "Allow public insert on sales"
ON "public"."sales"
AS PERMISSIVE 
FOR INSERT
TO public
WITH CHECK (TRUE);


CREATE OR REPLACE FUNCTION devolve_ml_pote(pote_id_param uuid, ml_devolvido numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Necessário se você usa RLS na tabela 'potes'
AS $$
BEGIN
    UPDATE potes
    SET 
        remaining_ml = remaining_ml + ml_devolvido,
        status = 'ativo' -- Garante que o pote volte ao status 'ativo'
    WHERE id = pote_id_param;
END;
$$;
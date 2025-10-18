-- Remover a foreign key antiga
ALTER TABLE public.sales
DROP CONSTRAINT IF EXISTS sales_product_id_fkey;

-- Criar a nova FK apontando para acai_products
ALTER TABLE public.sales
ADD CONSTRAINT sales_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES public.acai_products (id)
ON DELETE CASCADE;

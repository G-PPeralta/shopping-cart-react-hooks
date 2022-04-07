import {
  createContext,
  ReactNode,
  useContext,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]; // cria uma cópia para não alterar o original (princípio da imutabilidade)
      const productAlreadyExists = updatedCart.find(
        (product) => product.id === productId
      );
      const stock = await api.get(`/stock/${productId}`); //pega o objeto do estoque correspondente ao ID
      const stockAmount = stock.data.amount; // pega somente o valor da chave amount
      const currentAmount = productAlreadyExists // verifica qual é o amount atual, se o produto ainda não existe então é zero
        ? productAlreadyExists.amount
        : 0;
      const amountAfterInsertedNewProduct = currentAmount + 1; // amount depois de inserir novo produto

      if (amountAfterInsertedNewProduct > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque"); // verifica se existe quantidade suficiente do produto em estoque 
        return
      }

      if (productAlreadyExists) {
        productAlreadyExists.amount = amountAfterInsertedNewProduct;
      } else {
        const product = await api.get(`/products/${productId}`);
        const newProduct = {
          ...product.data,
          amount: 1,
        };
        updatedCart.push(newProduct);
      }
      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex((product) => product.id === productId);
      if(productIndex >= 0) {
        updatedCart.splice(productIndex, 1)
        setCart(updatedCart)
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        return
      }
      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;
      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }
      const updatedCart = [...cart];
      const productAlreadyExists = updatedCart.find((product) => product.id === productId);
      if(productAlreadyExists) {
        productAlreadyExists.amount = amount;
        setCart(updatedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      } else {
        throw Error()
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

export type Location = 'local' | 'domicilio'

export type Service = {
  name: string
  duration: number
  price: number
  priceLabel?: string  // si está, se muestra en vez del precio
}

export type BookingState = {
  step: number
  location: Location | null
  service: Service | null
  date: Date | null
  time: string | null
  nombre: string
  email: string
  whatsapp: string
  direccion: string
  nota: string
}
